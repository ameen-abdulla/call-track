import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/api-utils'

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth()
  if (error) return error

  const body = await req.json()
  const { contactId, outcome, interestLevel, feedbackNotes, nextActivity } = body

  if (!contactId || !outcome) {
    return NextResponse.json({ error: 'contactId and outcome required' }, { status: 400 })
  }

  // Verify agent owns this contact (unless admin)
  const contact = await prisma.contact.findUnique({ where: { id: contactId } })
  if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
  if (session!.user.role === 'FREELANCER' && contact.assignedToId !== session!.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Map outcome to contact status
  const statusMap: Record<string, string> = {
    connected: 'contacted',
    callback_requested: 'follow_up',
    not_interested: 'lost',
    no_answer: 'queued',
    busy: 'queued',
    wrong_number: 'queued',
  }

  const [call] = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const call = await tx.call.create({
      data: {
        contactId,
        agentId: session!.user.id,
        outcome,
        interestLevel: interestLevel || null,
        feedbackNotes: feedbackNotes || null,
      },
    })

    await tx.contact.update({
      where: { id: contactId },
      data: { status: statusMap[outcome] || 'contacted' },
    })

    if (nextActivity) {
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
