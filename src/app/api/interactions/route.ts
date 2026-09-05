import { NextRequest, NextResponse } from 'next/server'
import { Prisma, InteractionType } from '@prisma/client'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  const { error, session } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const contactId = searchParams.get('contactId')
  const freelancerId = searchParams.get('freelancerId')
  const type = searchParams.get('type') as InteractionType | null
  const connected = searchParams.get('connected')

  const where: Prisma.InteractionWhereInput = {}

  if (session!.user.role === 'FREELANCER') {
    where.freelancerId = session!.user.id
  } else if (freelancerId) {
    where.freelancerId = freelancerId
  }

  if (contactId) where.contactId = contactId
  if (type) where.type = type
  if (connected !== null && connected !== undefined && connected !== '') {
    where.connected = connected === 'true'
  }

  const interactions = await prisma.interaction.findMany({
    where,
    include: {
      contact: { select: { id: true, name: true, phone: true, company: true } },
      freelancer: { select: { id: true, name: true } },
      callAttempt: { select: { id: true, triggeredAt: true, method: true } },
    },
    orderBy: { occurredAt: 'desc' },
  })

  return NextResponse.json(interactions)
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth()
  if (error) return error

  try {
    const body = await req.json()
    const {
      contactId,
      type = 'CALL',
      connected,
      callAttemptId,
      response,
      interestArea,
      nextActivityRequired = false,
      nextActivityDate,
      nextActivity,
      notes,
    } = body

    if (!contactId) {
      return NextResponse.json({ error: 'contactId is required' }, { status: 400 })
    }

    const contact = await prisma.contact.findFirst({
      where: { id: contactId, deletedAt: null },
    })

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found or has been deleted' }, { status: 404 })
    }

    if (session!.user.role === 'FREELANCER' && contact.assignedToId !== session!.user.id) {
      return NextResponse.json({ error: 'Forbidden — contact is not assigned to you' }, { status: 403 })
    }

    // Auto-link CallAttempt if this is a CALL interaction and callAttemptId was not provided/resolved
    let finalCallAttemptId = callAttemptId || null
    if (type === 'CALL' && !finalCallAttemptId) {
      const windowMinutes = parseInt(process.env.CALL_VERIFICATION_WINDOW_MINUTES || '30', 10)
      const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000)
      const recentAttempt = await prisma.callAttempt.findFirst({
        where: {
          contactId,
          freelancerId: session!.user.id,
          triggeredAt: { gte: windowStart },
        },
        orderBy: { triggeredAt: 'desc' },
      })
      if (recentAttempt) {
        finalCallAttemptId = recentAttempt.id
      }
    }

    // Determine updated contact status
    let updatedStatus = contact.status
    if (response === 'Not Interested') {
      updatedStatus = 'lost'
    } else if (response === 'Interested – Request Demo' || response === 'Interested – Request Quotation') {
      updatedStatus = 'converted'
    } else if (response === 'Call Back Later' || nextActivityRequired) {
      updatedStatus = 'follow_up'
    } else if (type === 'CALL' && connected === false) {
      updatedStatus = 'queued'
    } else if (type === 'CALL' && connected === true) {
      updatedStatus = 'contacted'
    } else if (type === 'MEETING' || type === 'EMAIL') {
      updatedStatus = 'contacted'
    }

    const interaction = await prisma.$transaction(async (tx) => {
      // 1. Create interaction record
      const rec = await tx.interaction.create({
        data: {
          contactId,
          freelancerId: session!.user.id,
          type: (type as InteractionType) || InteractionType.CALL,
          connected: type === 'CALL' ? (connected !== undefined ? Boolean(connected) : null) : null,
          callAttemptId: finalCallAttemptId,
          response: response || null,
          interestArea: interestArea || null,
          nextActivityRequired: Boolean(nextActivityRequired),
          nextActivityDate: nextActivityDate ? new Date(nextActivityDate) : null,
          nextActivity: nextActivity || null,
          notes: notes || null,
          occurredAt: new Date(),
        },
      })

      // 2. Update contact status
      await tx.contact.update({
        where: { id: contactId },
        data: { status: updatedStatus },
      })

      // 3. Auto retry or manually scheduled follow-up activity
      const retryDelayHours = parseInt(process.env.RETRY_FOLLOWUP_DELAY_HOURS || '4', 10)

      if (type === 'CALL' && connected === false) {
        // Not-connected path: server-side auto RETRY_CALL — client's nextActivityRequired is ignored.
        const existingRetry = await tx.activity.findFirst({
          where: {
            contactId,
            followUpType: 'RETRY_CALL',
            status: { in: ['pending', 'overdue'] },
          },
        })

        if (existingRetry) {
          // Update the existing retry so we don't accumulate duplicate rows.
          await tx.activity.update({
            where: { id: existingRetry.id },
            data: {
              dueDate: new Date(Date.now() + retryDelayHours * 3600000),
              status: 'pending',
            },
          })
        } else {
          // No open retry exists yet — create one.
          await tx.activity.create({
            data: {
              contactId,
              agentId: session!.user.id,
              activityType: 'call',
              followUpType: 'RETRY_CALL',
              dueDate: new Date(Date.now() + retryDelayHours * 3600000),
            },
          })
        }
      } else if (nextActivityRequired && nextActivityDate) {
        // Connected call / email / meeting path — manually scheduled by freelancer.
        // Categorize followUpType based on response.
        let followUpType: 'CALLBACK_REQUESTED' | 'ESCALATION' | 'MANUAL' = 'MANUAL'
        if (response === 'Call Back Later') {
          followUpType = 'CALLBACK_REQUESTED'
        } else if (response === 'Need Management Approval' || response === 'Decision Maker Not Available') {
          followUpType = 'ESCALATION'
        }

        await tx.activity.create({
          data: {
            contactId,
            agentId: session!.user.id,
            activityType: nextActivity || (type === 'MEETING' ? 'meeting' : type === 'EMAIL' ? 'email' : 'call'),
            followUpType,
            dueDate: new Date(nextActivityDate),
          },
        })
      }

      // 4. Maintain legacy Call table record for backward compatibility
      if (type === 'CALL') {
        const legacyOutcome = connected === true ? 'connected' : connected === false ? 'no_answer' : 'connected'
        await tx.call.create({
          data: {
            contactId,
            agentId: session!.user.id,
            outcome: legacyOutcome,
            responseLookup: response || null,
            interestLevel: response?.includes('Interested') ? 'hot' : response === 'Not Interested' ? 'cold' : 'warm',
            feedbackNotes: notes || null,
            createdAt: new Date(),
          },
        })
      }

      return rec
    })

    return NextResponse.json(interaction, { status: 201 })
  } catch (err) {
    console.error('Error logging interaction:', err)
    return NextResponse.json({ error: 'Failed to record interaction' }, { status: 500 })
  }
}
