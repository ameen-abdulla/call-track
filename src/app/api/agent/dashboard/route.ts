import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/api-utils'
import { getContactsUrgency, computeUrgencySummary } from '@/lib/urgency'

export async function GET() {
  const { error, session } = await requireAuth('FREELANCER')
  if (error) return error

  const agentId = session!.user.id
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [todaysCalls, queue, followUps, unreadCount, interactions, calls] = await Promise.all([
    // Activities due today
    prisma.activity.findMany({
      where: {
        agentId,
        dueDate: { gte: today, lt: tomorrow },
        status: { in: ['pending', 'overdue'] },
        contact: { deletedAt: null },
      },
      include: { contact: { include: { tags: { include: { tag: true } } } } },
      orderBy: { dueDate: 'asc' },
    }),
    // Queued contacts (assigned but not yet called)
    prisma.contact.findMany({
      where: { assignedToId: agentId, status: { in: ['queued', 'new'] }, deletedAt: null },
      include: { tags: { include: { tag: true } } },
      orderBy: [{ callPriority: 'asc' }, { updatedAt: 'desc' }],
    }),
    // Follow-ups due (overdue activities)
    prisma.activity.findMany({
      where: {
        agentId,
        status: { in: ['pending', 'overdue'] },
        dueDate: { lte: new Date() },
        contact: { deletedAt: null },
      },
      include: { contact: { include: { tags: { include: { tag: true } } } } },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.notification.count({ where: { userId: agentId, isRead: false } }),
    // Last 50 interactions
    prisma.interaction.findMany({
      where: { freelancerId: agentId },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            phone: true,
            company: true,
          },
        },
      },
      orderBy: { occurredAt: 'desc' },
      take: 50,
    }),
    // Last 50 calls (for fallback / compatibility)
    prisma.call.findMany({
      where: { agentId },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            phone: true,
            company: true,
          },
        },
        activities: {
          select: { dueDate: true },
          take: 1,
        },
      },
      orderBy: { callTime: 'desc' },
      take: 50,
    }),
  ])

  // Combine interactions and calls into a unified activityLog
  type ActivityLogItem = {
    id: string
    calledAt: string
    outcome: string
    notes: string | null
    scheduledAt: string | null
    contact: {
      id: string
      name: string
      phone: string
      company: string | null
    }
    type?: string
    connected?: boolean | null
    response?: string | null
    interestArea?: string | null
    nextActivityRequired?: boolean
    nextActivity?: string | null
    source: 'interaction' | 'call'
  }

  const seenTimestamps = new Set<string>()
  const combinedLog: ActivityLogItem[] = []

  for (const item of interactions) {
    const key = `${item.contactId}-${Math.floor(new Date(item.occurredAt).getTime() / 60000)}`
    seenTimestamps.add(key)
    combinedLog.push({
      id: item.id,
      calledAt: item.occurredAt.toISOString(),
      outcome: item.response || (item.connected === true ? 'answered' : item.connected === false ? 'no_answer' : item.type),
      notes: item.notes,
      scheduledAt: item.nextActivityDate ? item.nextActivityDate.toISOString() : null,
      contact: item.contact,
      type: item.type,
      connected: item.connected,
      response: item.response,
      interestArea: item.interestArea,
      nextActivityRequired: item.nextActivityRequired,
      nextActivity: item.nextActivity,
      source: 'interaction',
    })
  }

  for (const c of calls) {
    const key = `${c.contactId}-${Math.floor(new Date(c.callTime || c.createdAt).getTime() / 60000)}`
    if (!seenTimestamps.has(key)) {
      combinedLog.push({
        id: c.id,
        calledAt: (c.callTime || c.createdAt).toISOString(),
        outcome: c.responseLookup || c.outcome,
        notes: c.feedbackNotes,
        scheduledAt: c.activities?.[0]?.dueDate ? c.activities[0].dueDate.toISOString() : null,
        contact: c.contact,
        type: 'CALL',
        connected: c.outcome !== 'no_answer' && c.outcome !== 'busy',
        response: c.responseLookup,
        interestArea: null,
        nextActivityRequired: Boolean(c.activities?.[0]),
        nextActivity: null,
        source: 'call',
      })
    }
  }

  combinedLog.sort((a, b) => new Date(b.calledAt).getTime() - new Date(a.calledAt).getTime())
  const activityLog = combinedLog.slice(0, 50)

  const urgencyMap = await getContactsUrgency(queue)
  const queueWithUrgency = queue.map(c => ({
    ...c,
    urgency: urgencyMap.get(c.id) || {
      status: 'unassigned',
      assignedAt: null,
      hoursElapsed: null,
      firstAttemptAt: null,
    },
  }))

  queueWithUrgency.sort((a, b) => {
    const pA = a.callPriority || 'Z'
    const pB = b.callPriority || 'Z'
    if (pA !== pB) return pA.localeCompare(pB)
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })

  const urgencySummary = computeUrgencySummary(queueWithUrgency.map(c => c.urgency))

  return NextResponse.json({
    todaysCalls,
    queue: queueWithUrgency,
    followUps,
    activityLog,
    unreadCount,
    urgencySummary: {
      green: urgencySummary.green,
      orange: urgencySummary.orange,
      red: urgencySummary.red,
      attempted: urgencySummary.attempted,
    },
  })
}
