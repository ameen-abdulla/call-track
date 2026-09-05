import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/api-utils'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth('ADMIN')
  if (error) return error
  const { id } = await params
  const { toUserId, force = false } = await req.json()

  if (!toUserId) {
    return NextResponse.json({ error: 'toUserId is required' }, { status: 400 })
  }

  const target = await prisma.user.findUnique({ where: { id: toUserId } })
  if (!target || target.role !== 'FREELANCER' || target.freelancerStatus !== 'APPROVED') {
    return NextResponse.json({ error: 'Target must be an approved freelancer' }, { status: 400 })
  }

  const contact = await prisma.contact.findFirst({ where: { id, deletedAt: null } })
  if (!contact) return NextResponse.json({ error: 'Contact not found or has been deleted' }, { status: 404 })

  // Block if contact has an active call in progress (status = 'contacted' and last call < 30 min ago)
  if (!force) {
    const recentCall = await prisma.call.findFirst({
      where: {
        contactId: id,
        createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
      },
    })
    if (recentCall) {
      return NextResponse.json(
        { error: 'Contact has an active recent call. Pass force: true to override.' },
        { status: 409 }
      )
    }
  }

  const previousAssigneeId = contact.assignedToId

  await prisma.$transaction(async (tx) => {
    await tx.contact.update({
      where: { id },
      data: { assignedToId: toUserId },
    })
    // Transfer open follow-up activities to the new owner.
    // Completed activities keep their original agentId for historical accuracy.
    await tx.activity.updateMany({
      where: { contactId: id, status: { in: ['pending', 'overdue'] } },
      data: { agentId: toUserId },
    })
    await tx.assignmentHistory.create({
      data: {
        contactId: id,
        fromUserId: previousAssigneeId,
        toUserId,
        changedById: session!.user.id,
        reason: 'admin_assign',
      },
    })
  })

  const updated = await prisma.contact.findUnique({
    where: { id },
    include: { assignedTo: { select: { id: true, name: true } } },
  })
  return NextResponse.json(updated)
}
