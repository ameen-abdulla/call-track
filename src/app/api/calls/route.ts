import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/api-utils'

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth()
  if (error) return error

  const body = await req.json()
  const { contactId, outcome, responseLookup, recommendedAction, interestLevel, feedbackNotes, nextActivity } = body

  if (!contactId || !outcome) {
    return NextResponse.json({ error: 'contactId and outcome required' }, { status: 400 })
  }

  // Verify agent owns this contact (unless admin)
  const contact = await prisma.contact.findUnique({ where: { id: contactId } })
  if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
  if (session!.user.role === 'FREELANCER' && contact.assignedToId !== session!.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Map outcome and responseLookup to contact status
  let newStatus = 'contacted'
  if (responseLookup === 'Not Interested' || outcome === 'not_interested') {
    newStatus = 'lost'
  } else if (responseLookup === 'Interested – Request Demo' || responseLookup === 'Interested – Request Quotation') {
    newStatus = 'converted'
  } else if (responseLookup === 'Call Back Later' || outcome === 'callback_requested') {
    newStatus = 'follow_up'
  } else if (['no_answer', 'busy', 'wrong_number'].includes(outcome)) {
    newStatus = 'queued'
  } else if (responseLookup) {
    newStatus = 'follow_up'
  }

  const [call] = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const call = await tx.call.create({
      data: {
        contactId,
        agentId: session!.user.id,
        outcome,
        responseLookup: responseLookup || null,
        recommendedAction: recommendedAction || null,
        interestLevel: interestLevel || null,
        feedbackNotes: feedbackNotes || null,
      },
    })

    await tx.contact.update({
      where: { id: contactId },
      data: { status: newStatus },
    })

    if (nextActivity && nextActivity.dueDate) {
      await tx.activity.create({
        data: {
          contactId,
          agentId: session!.user.id,
          callId: call.id,
          activityType: nextActivity.type || 'call',
          dueDate: new Date(nextActivity.dueDate),
        },
      })
    }

    return [call]
  })

  return NextResponse.json(call, { status: 201 })
}
