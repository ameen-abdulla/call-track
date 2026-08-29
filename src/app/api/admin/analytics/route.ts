import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/api-utils'
import { FEEDBACK_OPTIONS, INTEREST_AREAS } from '@/lib/feedback-constants'
import { getContactsUrgency } from '@/lib/urgency'

export async function GET(req: NextRequest) {
  const { error, session } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const dateRange = searchParams.get('dateRange') || 'all' // all | today | 7d | 30d | custom
  const startDateParam = searchParams.get('startDate')
  const endDateParam = searchParams.get('endDate')
  const reqFreelancerId = searchParams.get('freelancerId')
  const reqTagId = searchParams.get('tagId')

  // Role-enforced scoping
  let targetFreelancerId: string | null = null
  if (session!.user.role === 'FREELANCER') {
    targetFreelancerId = session!.user.id
  } else if (reqFreelancerId && reqFreelancerId !== 'all') {
    targetFreelancerId = reqFreelancerId
  }

  // Calculate Date Filter
  let dateFilter: { gte?: Date; lte?: Date } | undefined
  const now = new Date()

  if (dateRange === 'today') {
    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)
    const endOfToday = new Date(startOfToday)
    endOfToday.setDate(endOfToday.getDate() + 1)
    dateFilter = { gte: startOfToday, lte: endOfToday }
  } else if (dateRange === '7d') {
    const d = new Date(now)
    d.setDate(d.getDate() - 7)
    dateFilter = { gte: d, lte: now }
  } else if (dateRange === '30d') {
    const d = new Date(now)
    d.setDate(d.getDate() - 30)
    dateFilter = { gte: d, lte: now }
  } else if (dateRange === 'custom' && (startDateParam || endDateParam)) {
    dateFilter = {}
    if (startDateParam) dateFilter.gte = new Date(startDateParam)
    if (endDateParam) {
      const end = new Date(endDateParam)
      end.setHours(23, 59, 59, 999)
      dateFilter.lte = end
    }
  }

  // Base contact filter
  const contactWhere: Prisma.ContactWhereInput = {
    deletedAt: null,
    ...(targetFreelancerId ? { assignedToId: targetFreelancerId } : {}),
    ...(reqTagId && reqTagId !== 'all' ? { tags: { some: { tagId: reqTagId } } } : {}),
  }

  // Base interaction filter
  const interactionWhere: Prisma.InteractionWhereInput = {
    contact: { deletedAt: null },
    ...(targetFreelancerId ? { freelancerId: targetFreelancerId } : {}),
    ...(reqTagId && reqTagId !== 'all' ? { contact: { tags: { some: { tagId: reqTagId } } } } : {}),
    ...(dateFilter ? { occurredAt: dateFilter } : {}),
  }

  // Base activity filter
  const activityWhere: Prisma.ActivityWhereInput = {
    contact: { deletedAt: null },
    ...(targetFreelancerId ? { agentId: targetFreelancerId } : {}),
    ...(reqTagId && reqTagId !== 'all' ? { contact: { tags: { some: { tagId: reqTagId } } } } : {}),
  }

  // Fetch parallel data
  const [
    contacts,
    interactions,
    activities,
    freelancers,
    tags,
  ] = await Promise.all([
    prisma.contact.findMany({
      where: contactWhere,
      include: {
        tags: { include: { tag: true } },
        assignedTo: { select: { id: true, name: true } },
        interactions: {
          select: { id: true, type: true, connected: true, response: true, interestArea: true, occurredAt: true },
        },
      },
    }),
    prisma.interaction.findMany({
      where: interactionWhere,
      include: {
        contact: { select: { id: true, name: true } },
        freelancer: { select: { id: true, name: true } },
        callAttempt: { select: { id: true } },
      },
      orderBy: { occurredAt: 'asc' },
    }),
    prisma.activity.findMany({
      where: activityWhere,
      include: {
        contact: { select: { id: true, name: true } },
        agent: { select: { id: true, name: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: 'FREELANCER' },
      select: { id: true, name: true, email: true, freelancerStatus: true },
    }),
    prisma.tag.findMany({
      include: {
        contacts: {
          where: { contact: { deletedAt: null } },
          include: { contact: { select: { id: true, assignedToId: true } } },
        },
      },
    }),
  ])

  // --- 1. Top KPI Calculations ---
  const totalProspects = contacts.length
  const assignedProspects = contacts.filter(c => c.assignedToId).length
  const unassignedProspects = contacts.filter(c => !c.assignedToId).length

  const totalInteractions = interactions.length
  const callsLogged = interactions.filter(i => i.type === 'CALL').length
  const emailsLogged = interactions.filter(i => i.type === 'EMAIL').length
  const meetingsLogged = interactions.filter(i => i.type === 'MEETING').length

  const demosBooked = interactions.filter(i => i.response?.includes('Request Demo') || i.type === 'MEETING').length
  const quotationsRequested = interactions.filter(i => i.response?.includes('Request Quotation')).length
  const convertedContacts = contacts.filter(c => c.status === 'converted').length
  const conversionRate = totalProspects > 0 ? Math.round((convertedContacts / totalProspects) * 100) : 0

  const overdueFollowUps = activities.filter(a => a.status === 'overdue' || (a.status === 'pending' && new Date(a.dueDate) < now)).length

  // --- 2. Coverage by Tag ---
  const tagCoverage = tags.map(t => {
    const inTag = t.contacts.map(ct => ct.contact)
    const totalInTag = inTag.length
    const assignedInTag = inTag.filter(c => c.assignedToId).length
    const unassignedInTag = inTag.filter(c => !c.assignedToId).length
    return {
      id: t.id,
      name: t.name,
      total: totalInTag,
      assigned: assignedInTag,
      unassigned: unassignedInTag,
    }
  })

  // --- 3. Freelancer Workload & Productivity ---
  const freelancerWorkload = freelancers.map(f => {
    const fContacts = contacts.filter(c => c.assignedToId === f.id)
    const fInteractions = interactions.filter(i => i.freelancerId === f.id)
    const fCalls = fInteractions.filter(i => i.type === 'CALL')
    const connectedCalls = fCalls.filter(i => i.connected === true).length
    const unverifiedCalls = fCalls.filter(i => !i.callAttemptId).length
    const connectedRate = fCalls.length > 0 ? Math.round((connectedCalls / fCalls.length) * 100) : 0
    const followupsOwed = activities.filter(a => a.agentId === f.id && (a.status === 'pending' || a.status === 'overdue')).length

    return {
      id: f.id,
      name: f.name,
      status: f.freelancerStatus || 'ACTIVE',
      assignedContacts: fContacts.length,
      interactionsLogged: fInteractions.length,
      callsLogged: fCalls.length,
      connectedCalls,
      connectedRate,
      unverifiedCalls,
      followupsOwed,
    }
  })

  // --- 4. Connected vs Not Connected Calls ---
  const callInteractions = interactions.filter(i => i.type === 'CALL')
  const connectedCount = callInteractions.filter(i => i.connected === true).length
  const notConnectedCount = callInteractions.filter(i => i.connected === false).length
  const unknownConnectedCount = callInteractions.filter(i => i.connected === null).length
  const unverifiedCount = callInteractions.filter(i => !i.callAttemptId).length

  // --- 5. Interactions Timeline ---
  const timelineMap: Record<string, { date: string; calls: number; emails: number; meetings: number }> = {}
  interactions.forEach(i => {
    const dStr = new Date(i.occurredAt).toISOString().slice(0, 10)
    if (!timelineMap[dStr]) {
      timelineMap[dStr] = { date: dStr, calls: 0, emails: 0, meetings: 0 }
    }
    if (i.type === 'CALL') timelineMap[dStr].calls++
    else if (i.type === 'EMAIL') timelineMap[dStr].emails++
    else if (i.type === 'MEETING') timelineMap[dStr].meetings++
  })
  const interactionsTimeline = Object.values(timelineMap).sort((a, b) => a.date.localeCompare(b.date))

  // --- 6. Response / Outcome Analytics ---
  const responseMap: Record<string, { count: number; group: string }> = {}
  FEEDBACK_OPTIONS.forEach(opt => {
    responseMap[opt.value] = { count: 0, group: opt.group }
  })
  interactions.forEach(i => {
    if (i.response) {
      if (!responseMap[i.response]) {
        responseMap[i.response] = { count: 0, group: 'Other' }
      }
      responseMap[i.response].count++
    }
  })
  const responseBreakdown = Object.entries(responseMap)
    .map(([name, data]) => ({ name, count: data.count, group: data.group }))
    .filter(item => item.count > 0 || dateRange === 'all')

  // --- 7. Interest Area Analytics ---
  const interestMap: Record<string, number> = {}
  INTEREST_AREAS.forEach(area => {
    interestMap[area.value] = 0
  })
  interactions.forEach(i => {
    if (i.interestArea) {
      interestMap[i.interestArea] = (interestMap[i.interestArea] || 0) + 1
    }
  })
  const interestAreaBreakdown = Object.entries(interestMap).map(([name, count]) => ({ name, count }))

  // --- 8. Follow-up Pipeline Buckets ---
  const startToday = new Date(now)
  startToday.setHours(0, 0, 0, 0)
  const endToday = new Date(startToday)
  endToday.setDate(endToday.getDate() + 1)
  const end7Days = new Date(startToday)
  end7Days.setDate(end7Days.getDate() + 7)
  const end30Days = new Date(startToday)
  end30Days.setDate(end30Days.getDate() + 30)

  let pipelineOverdue = 0
  let pipelineToday = 0
  let pipeline7Days = 0
  let pipeline8to30 = 0
  let pipeline31Plus = 0

  activities.filter(a => a.status === 'pending' || a.status === 'overdue').forEach(a => {
    const d = new Date(a.dueDate)
    if (d < startToday) pipelineOverdue++
    else if (d >= startToday && d < endToday) pipelineToday++
    else if (d >= endToday && d <= end7Days) pipeline7Days++
    else if (d > end7Days && d <= end30Days) pipeline8to30++
    else pipeline31Plus++
  })

  const contactsWithPendingActivityIds = new Set(activities.map(a => a.contactId))
  const noFollowupCount = contacts.filter(c => !contactsWithPendingActivityIds.has(c.id)).length

  const followupPipeline = {
    overdue: pipelineOverdue,
    dueToday: pipelineToday,
    next7Days: pipeline7Days,
    days8to30: pipeline8to30,
    days31Plus: pipeline31Plus,
    noFollowup: noFollowupCount,
  }

  // --- 9. Data Quality Panel ---
  const neverCalledCount = contacts.filter(c => c.interactions.length === 0).length
  const noResponseCount = contacts.filter(c => c.interactions.length > 0 && !c.interactions.some(i => i.response)).length
  const missingPhoneOrEmail = contacts.filter(c => !c.phone || !c.email).length

  const dataQuality = {
    neverCalledCount,
    noResponseCount,
    missingPhoneOrEmail,
    unverifiedCallLogs: unverifiedCount,
  }

  // --- 10. Sales Funnel ---
  const calledContacts = contacts.filter(c => c.interactions.some(i => i.type === 'CALL')).length
  const positiveInterestContacts = contacts.filter(c =>
    c.interactions.some(i => i.response?.includes('Interested') || i.response?.includes('Demo') || i.response?.includes('Quotation'))
  ).length
  const demoContacts = contacts.filter(c => c.interactions.some(i => i.response?.includes('Demo') || i.type === 'MEETING')).length
  const quoteContacts = contacts.filter(c => c.interactions.some(i => i.response?.includes('Quotation'))).length
  const convertedFunnel = contacts.filter(c => c.status === 'converted').length

  const stagesRaw = [
    { stage: 'Total Prospects', count: totalProspects },
    { stage: 'Assigned', count: assignedProspects },
    { stage: 'Called', count: calledContacts },
    { stage: 'Positive Interest', count: positiveInterestContacts },
    { stage: 'Demo Booked', count: demoContacts },
    { stage: 'Quotation Requested', count: quoteContacts },
    { stage: 'Converted', count: convertedFunnel },
  ]

  const salesFunnel = stagesRaw.map((st, idx) => {
    const prev = idx > 0 ? stagesRaw[idx - 1].count : st.count
    const dropOffPercent = prev > 0 ? Math.round(((prev - st.count) / prev) * 100) : 0
    return {
      ...st,
      dropOff: dropOffPercent > 0 ? dropOffPercent : 0,
      conversionFromTotal: totalProspects > 0 ? Math.round((st.count / totalProspects) * 100) : 0,
    }
  })

  // --- 11. Urgency Meter Analytics ---
  // Note: Urgency is intentionally computed over the current contactWhere-scoped set,
  // completely ignoring the date-range filter because urgency measures current live state,
  // not historical activity within an arbitrary past date window.
  const urgencyMap = await getContactsUrgency(contacts)

  const urgencyCounts = { green: 0, orange: 0, red: 0, attempted: 0, unassigned: 0 }

  const freelancerUrgencyMap: Record<string, { freelancerId: string; name: string; green: number; orange: number; red: number; hasEligible: boolean }> = {}
  freelancers.forEach(f => {
    freelancerUrgencyMap[f.id] = {
      freelancerId: f.id,
      name: f.name,
      green: 0,
      orange: 0,
      red: 0,
      hasEligible: false,
    }
  })

  contacts.forEach(c => {
    const urg = urgencyMap.get(c.id)
    if (!urg) return

    if (urg.status === 'green') urgencyCounts.green++
    else if (urg.status === 'orange') urgencyCounts.orange++
    else if (urg.status === 'red') urgencyCounts.red++
    else if (urg.status === 'attempted') urgencyCounts.attempted++
    else if (urg.status === 'unassigned') urgencyCounts.unassigned++

    if (c.assignedToId && freelancerUrgencyMap[c.assignedToId]) {
      const fEntry = freelancerUrgencyMap[c.assignedToId]
      if (urg.status === 'green') {
        fEntry.green++
        fEntry.hasEligible = true
      } else if (urg.status === 'orange') {
        fEntry.orange++
        fEntry.hasEligible = true
      } else if (urg.status === 'red') {
        fEntry.red++
        fEntry.hasEligible = true
      } else if (urg.status === 'attempted') {
        fEntry.hasEligible = true
      }
    }
  })

  const urgencyByFreelancer = Object.values(freelancerUrgencyMap)
    .filter(f => f.hasEligible)
    .map(({ freelancerId, name, green, orange, red }) => ({
      freelancerId,
      name,
      green,
      orange,
      red,
    }))

  const urgency = {
    counts: urgencyCounts,
    byFreelancer: urgencyByFreelancer,
  }

  return NextResponse.json({
    kpis: {
      totalProspects,
      assignedProspects,
      unassignedProspects,
      totalInteractions,
      callsLogged,
      emailsLogged,
      meetingsLogged,
      followUpsDue: overdueFollowUps,
      demosBooked,
      quotationsRequested,
      converted: convertedContacts,
      conversionRate,
    },
    tagCoverage,
    freelancerWorkload,
    connectedVsNot: {
      connected: connectedCount,
      notConnected: notConnectedCount,
      unknown: unknownConnectedCount,
      unverifiedCount,
    },
    interactionsTimeline,
    responseBreakdown,
    interestAreaBreakdown,
    followupPipeline,
    dataQuality,
    salesFunnel,
    urgency,
  })
}
