import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/api-utils'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth()
  if (error) return error
  const { id } = await params

  const contact = await prisma.contact.findUnique({
    where: { id },
    include: {
      tags: { include: { tag: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      calls: { orderBy: { callTime: 'desc' }, include: { agent: { select: { name: true } } } },
      interactions: {
        orderBy: { occurredAt: 'desc' },
        include: {
          freelancer: { select: { id: true, name: true } },
          callAttempt: { select: { id: true, triggeredAt: true, method: true } },
        },
      },
      activities: { orderBy: { dueDate: 'asc' }, include: { agent: { select: { name: true } } } },
    },
  })

  if (!contact || (contact.deletedAt && session!.user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
  }

  // Freelancers can only see their own contacts
  if (session!.user.role === 'FREELANCER' && contact.assignedToId !== session!.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json(contact)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth('ADMIN')
  if (error) return error
  const { id } = await params

  const existing = await prisma.contact.findUnique({
    where: { id },
    include: { tags: { include: { tag: true } } },
  })

  if (!existing) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })

  const body = await req.json()
  const { name, phone, phone2, email, company, source, status, topic, callPriority, tagIds } = body

  const updateData: Record<string, unknown> = {}
  if (name !== undefined) updateData.name = name
  if (phone !== undefined) updateData.phone = phone
  if (phone2 !== undefined) updateData.phone2 = phone2 || null
  if (email !== undefined) updateData.email = email || null
  if (company !== undefined) updateData.company = company || null
  if (source !== undefined) updateData.source = source || null
  if (status !== undefined) updateData.status = status
  if (topic !== undefined) updateData.topic = topic || null
  if (callPriority !== undefined) updateData.callPriority = callPriority || null

  const diff: Record<string, { before: unknown; after: unknown }> = {}
  for (const [k, v] of Object.entries(updateData)) {
    const prevVal = (existing as Record<string, unknown>)[k]
    if (prevVal !== v) {
      diff[k] = { before: prevVal, after: v }
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Handle tag updating if tagIds passed
    if (tagIds && Array.isArray(tagIds)) {
      await tx.contactTag.deleteMany({ where: { contactId: id } })
      await tx.contactTag.createMany({
        data: tagIds.map((tId: string) => ({ contactId: id, tagId: tId })),
      })
      diff.tags = {
        before: existing.tags.map(t => t.tag.name),
        after: tagIds,
      }
    }

    const res = await tx.contact.update({
      where: { id },
      data: updateData,
      include: { tags: { include: { tag: true } }, assignedTo: { select: { id: true, name: true } } },
    })

    // Write to ActivityLog
    if (Object.keys(diff).length > 0) {
      await tx.activityLog.create({
        data: {
          actorId: session!.user.id,
          action: 'CONTACT_EDITED',
          targetType: 'Contact',
          targetId: id,
          metadata: JSON.stringify({ diff, contactName: res.name }),
        },
      })
    }

    return res
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth('ADMIN')
  if (error) return error
  const { id } = await params

  const existing = await prisma.contact.findUnique({
    where: { id },
    include: { assignedTo: { select: { id: true, name: true } } },
  })

  if (!existing) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })

  await prisma.$transaction(async (tx) => {
    // Soft delete & unassign
    await tx.contact.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        assignedToId: null,
      },
    })

    if (existing.assignedToId) {
      await tx.assignmentHistory.create({
        data: {
          contactId: id,
          fromUserId: existing.assignedToId,
          toUserId: null,
          changedById: session!.user.id,
          reason: 'contact_deleted',
        },
      })
    }

    await tx.activityLog.create({
      data: {
        actorId: session!.user.id,
        action: 'CONTACT_DELETED',
        targetType: 'Contact',
        targetId: id,
        metadata: JSON.stringify({
          contactName: existing.name,
          previouslyAssignedTo: existing.assignedTo?.name || null,
        }),
      },
    })
  })

  return NextResponse.json({ success: true, message: 'Contact moved to deleted pool' })
}
