import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/api-utils'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth('ADMIN')
  if (error) return error
  const { id } = await params

  const body = await req.json()
  const agentId = body.agentId || body.toUserId
  const topic = body.topic

  if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 })

  const existingContact = await prisma.contact.findUnique({ where: { id } })
  if (!existingContact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })

  const previousAssigneeId = existingContact.assignedToId

  const contact = await prisma.$transaction(async (tx) => {
    const updated = await tx.contact.update({
      where: { id },
      data: { assignedToId: agentId, topic, status: 'queued' },
    })

    await tx.assignmentHistory.create({
      data: {
        contactId: id,
        fromUserId: previousAssigneeId,
        toUserId: agentId,
        changedById: session!.user.id,
        reason: 'agent_assigned',
      },
    })

    await tx.notification.create({
      data: {
        userId: agentId,
        type: 'assignment',
        message: `You have been assigned a new contact: ${updated.name}${topic ? ` — Topic: ${topic}` : ''}`,
        relatedId: updated.id,
        sentById: session!.user.id,
      },
    })

    return updated
  })

  return NextResponse.json(contact)
}
