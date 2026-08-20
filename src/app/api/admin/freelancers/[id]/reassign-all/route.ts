import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/api-utils'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth('ADMIN')
  if (error) return error
  const { id } = await params
  const { toUserId } = await req.json()

  if (!toUserId) {
    return NextResponse.json({ error: 'toUserId is required' }, { status: 400 })
  }

  const target = await prisma.user.findUnique({ where: { id: toUserId } })
  if (!target || target.role !== 'FREELANCER' || target.freelancerStatus !== 'APPROVED') {
    return NextResponse.json({ error: 'Target must be an approved freelancer' }, { status: 400 })
  }

  const contacts = await prisma.contact.findMany({
    where: { assignedToId: id },
    select: { id: true },
  })

  if (contacts.length === 0) {
    return NextResponse.json({ reassigned: 0 })
  }

  await prisma.$transaction(async (tx) => {
    for (const contact of contacts) {
      await tx.contact.update({
        where: { id: contact.id },
        data: { assignedToId: toUserId },
      })
      await tx.assignmentHistory.create({
        data: {
          contactId: contact.id,
          fromUserId: id,
          toUserId,
          changedById: session!.user.id,
          reason: 'bulk_reassign_from_freelancer',
        },
      })
    }
  })

  return NextResponse.json({ reassigned: contacts.length })
}
