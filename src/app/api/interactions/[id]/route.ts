import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/api-utils'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth()
  if (error) return error
  const { id } = await params

  const interaction = await prisma.interaction.findUnique({
    where: { id },
    include: {
      contact: { select: { id: true, name: true, phone: true, company: true } },
      freelancer: { select: { id: true, name: true } },
    },
  })

  if (interaction) {
    if (session!.user.role === 'FREELANCER' && interaction.freelancerId !== session!.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json(interaction)
  }

  const call = await prisma.call.findUnique({
    where: { id },
    include: {
      contact: { select: { id: true, name: true, phone: true, company: true } },
      agent: { select: { id: true, name: true } },
    },
  })

  if (call) {
    if (session!.user.role === 'FREELANCER' && call.agentId !== session!.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json(call)
  }

  return NextResponse.json({ error: 'Record not found' }, { status: 404 })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth()
  if (error) return error
  const { id } = await params

  try {
    const body = await req.json()
    const {
      response,
      outcome,
      interestArea,
      notes,
      connected,
      nextActivityRequired,
      nextActivityDate,
      nextActivity,
    } = body

    // 1. Check if it exists as an Interaction
    const existingInteraction = await prisma.interaction.findUnique({
      where: { id },
      include: { contact: true },
    })

    if (existingInteraction) {
      if (session!.user.role === 'FREELANCER' && existingInteraction.freelancerId !== session!.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const finalResponse = response !== undefined ? response : outcome
      let updatedContactStatus = existingInteraction.contact.status

      if (finalResponse === 'Not Interested' || outcome === 'not_interested') {
        updatedContactStatus = 'lost'
      } else if (finalResponse?.includes('Interested') || outcome === 'converted') {
        updatedContactStatus = 'converted'
      } else if (finalResponse === 'Call Back Later' || outcome === 'callback' || nextActivityRequired) {
        updatedContactStatus = 'follow_up'
      } else if (connected === false || outcome === 'no_answer' || outcome === 'busy') {
        updatedContactStatus = 'queued'
      } else if (connected === true || outcome === 'answered') {
        updatedContactStatus = 'contacted'
      }

      const updated = await prisma.$transaction(async (tx) => {
        const rec = await tx.interaction.update({
          where: { id },
          data: {
            response: finalResponse || null,
            interestArea: interestArea !== undefined ? interestArea : existingInteraction.interestArea,
            notes: notes !== undefined ? notes : existingInteraction.notes,
            connected: connected !== undefined ? connected : existingInteraction.connected,
            nextActivityRequired: nextActivityRequired !== undefined ? Boolean(nextActivityRequired) : existingInteraction.nextActivityRequired,
            nextActivityDate: nextActivityDate ? new Date(nextActivityDate) : (nextActivityRequired === false ? null : existingInteraction.nextActivityDate),
            nextActivity: nextActivity !== undefined ? nextActivity : existingInteraction.nextActivity,
          },
          include: {
            contact: {
              select: { id: true, name: true, phone: true, company: true },
            },
          },
        })

        if (updatedContactStatus !== existingInteraction.contact.status) {
          await tx.contact.update({
            where: { id: existingInteraction.contactId },
            data: { status: updatedContactStatus },
          })
        }

        if (nextActivityRequired && nextActivityDate) {
          await tx.activity.create({
            data: {
              contactId: existingInteraction.contactId,
              agentId: session!.user.id,
              activityType: nextActivity || 'call',
              dueDate: new Date(nextActivityDate),
            },
          })
        }

        return rec
      })

      return NextResponse.json(updated)
    }

    // 2. Check if it exists as a Call
    const existingCall = await prisma.call.findUnique({
      where: { id },
      include: { contact: true },
    })

    if (existingCall) {
      if (session!.user.role === 'FREELANCER' && existingCall.agentId !== session!.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const finalOutcome = outcome || response || existingCall.outcome
      let updatedContactStatus = existingCall.contact.status

      if (response === 'Not Interested' || finalOutcome === 'not_interested') {
        updatedContactStatus = 'lost'
      } else if (response?.includes('Interested') || finalOutcome === 'converted') {
        updatedContactStatus = 'converted'
      } else if (response === 'Call Back Later' || finalOutcome === 'callback' || nextActivityRequired) {
        updatedContactStatus = 'follow_up'
      } else if (connected === false || finalOutcome === 'no_answer' || finalOutcome === 'busy') {
        updatedContactStatus = 'queued'
      } else if (connected === true || finalOutcome === 'answered' || finalOutcome === 'connected') {
        updatedContactStatus = 'contacted'
      }

      const updated = await prisma.$transaction(async (tx) => {
        const rec = await tx.call.update({
          where: { id },
          data: {
            outcome: finalOutcome,
            responseLookup: response || existingCall.responseLookup,
            feedbackNotes: notes !== undefined ? notes : existingCall.feedbackNotes,
          },
          include: {
            contact: {
              select: { id: true, name: true, phone: true, company: true },
            },
          },
        })

        if (updatedContactStatus !== existingCall.contact.status) {
          await tx.contact.update({
            where: { id: existingCall.contactId },
            data: { status: updatedContactStatus },
          })
        }

        if (nextActivityRequired && nextActivityDate) {
          await tx.activity.create({
            data: {
              contactId: existingCall.contactId,
              agentId: session!.user.id,
              activityType: nextActivity || 'call',
              dueDate: new Date(nextActivityDate),
            },
          })
        }

        return rec
      })

      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: 'Record not found' }, { status: 404 })
  } catch (err) {
    console.error('Error updating interaction/call:', err)
    return NextResponse.json({ error: 'Failed to update record' }, { status: 500 })
  }
}