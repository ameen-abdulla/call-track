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
          callAttemptId: callAttemptId || null,
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

      // 3. Create schedule follow-up activity if requested
      if (nextActivityRequired && nextActivityDate) {
        await tx.activity.create({
          data: {
            contactId,
            agentId: session!.user.id,
            activityType: nextActivity || (type === 'MEETING' ? 'meeting' : type === 'EMAIL' ? 'email' : 'call'),
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
