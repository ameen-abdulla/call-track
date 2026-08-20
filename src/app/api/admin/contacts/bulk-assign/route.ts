import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/api-utils'

// GET: dry-run preview
export async function GET(req: NextRequest) {
  const { error } = await requireAuth('ADMIN')
  if (error) return error

  const { searchParams } = req.nextUrl
  const tagId = searchParams.get('tagId')
  const callPriority = searchParams.get('callPriority')
  const contactIds = searchParams.get('contactIds')?.split(',')

  if (!tagId && !callPriority && (!contactIds || contactIds.length === 0)) {
    return NextResponse.json({ error: 'At least one of tagId, callPriority, or contactIds must be provided' }, { status: 400 })
  }

  const where: Record<string, unknown> = {}
  if (contactIds && contactIds.length > 0) {
    where.id = { in: contactIds }
  } else {
    if (tagId) where.tags = { some: { tagId } }
    if (callPriority) where.callPriority = callPriority
  }

  const contacts = await prisma.contact.findMany({
    where,
    select: {
      id: true,
      name: true,
      assignedToId: true,
      assignedTo: { select: { id: true, name: true } },
    },
  })

  const unassigned = contacts.filter(c => !c.assignedToId)
  const assigned = contacts.filter(c => c.assignedToId)

  // Group assigned by freelancer name
  const byFreelancer: Record<string, { name: string; count: number }> = {}
  for (const c of assigned) {
    const key = c.assignedToId!
    if (!byFreelancer[key]) byFreelancer[key] = { name: c.assignedTo?.name ?? 'Unknown', count: 0 }
    byFreelancer[key].count++
  }

  return NextResponse.json({
    total: contacts.length,
    unassigned: unassigned.length,
    alreadyAssigned: assigned.length,
    byFreelancer: Object.values(byFreelancer),
  })
}

// POST: atomic commit
export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth('ADMIN')
  if (error) return error

  const { tagId, callPriority, contactIds, toUserId, overrideExisting = false } = await req.json()

  if (!toUserId) {
    return NextResponse.json({ error: 'toUserId is required' }, { status: 400 })
  }
  if (!tagId && !callPriority && (!contactIds || contactIds.length === 0)) {
    return NextResponse.json({ error: 'At least one of tagId, callPriority, or contactIds must be provided' }, { status: 400 })
  }

  const target = await prisma.user.findUnique({ where: { id: toUserId } })
  if (!target || target.role !== 'FREELANCER' || target.freelancerStatus !== 'APPROVED') {
    return NextResponse.json({ error: 'Target must be an approved freelancer' }, { status: 400 })
  }

  const where: Record<string, unknown> = {}
  if (contactIds && contactIds.length > 0) {
    where.id = { in: contactIds }
  } else {
    if (tagId) where.tags = { some: { tagId } }
    if (callPriority) where.callPriority = callPriority
  }

  const contacts = await prisma.contact.findMany({ where, select: { id: true, assignedToId: true } })
  const alreadyAssigned = contacts.filter(c => c.assignedToId && c.assignedToId !== toUserId)

  if (alreadyAssigned.length > 0 && !overrideExisting) {
    return NextResponse.json(
      { error: `${alreadyAssigned.length} contact(s) are already assigned to other freelancers. Pass overrideExisting: true to proceed.` },
      { status: 409 }
    )
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
          fromUserId: contact.assignedToId,
          toUserId,
          changedById: session!.user.id,
          reason: 'bulk_assign',
        },
      })
    }
  })

  return NextResponse.json({ assigned: contacts.length })
}
