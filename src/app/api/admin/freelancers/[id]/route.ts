import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/api-utils'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth('ADMIN')
  if (error) return error
  const { id } = await params

  const freelancer = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      freelancerStatus: true,
      applicationNote: true,
      appliedAt: true,
      reviewedAt: true,
      suspendedAt: true,
      createdAt: true,
      assignedContacts: {
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          phone: true,
          phone2: true,
          status: true,
          callPriority: true,
          topic: true,
          company: true,
          tags: { select: { tag: { select: { id: true, name: true } } } },
          _count: { select: { calls: true, interactions: true } },
        },
        orderBy: { updatedAt: 'desc' },
      },
      _count: {
        select: {
          assignedContacts: { where: { deletedAt: null } },
          calls: true,
          interactions: true,
        },
      },
    },
  })

  if (!freelancer) return NextResponse.json({ error: 'Freelancer not found' }, { status: 404 })
  return NextResponse.json(freelancer)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth('ADMIN')
  if (error) return error
  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      assignedContacts: { where: { deletedAt: null } },
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'Freelancer not found' }, { status: 404 })
  }

  if (user.role === 'ADMIN') {
    return NextResponse.json({ error: 'Cannot delete administrator accounts' }, { status: 403 })
  }

  await prisma.$transaction(async (tx) => {
    // 1. Unassign all contacts currently assigned to this freelancer
    if (user.assignedContacts.length > 0) {
      await tx.contact.updateMany({
        where: { assignedToId: id },
        data: { assignedToId: null, status: 'new' },
      })

      // Log assignment history for unassigned contacts
      for (const contact of user.assignedContacts) {
        await tx.assignmentHistory.create({
          data: {
            contactId: contact.id,
            fromUserId: id,
            toUserId: null,
            changedById: session!.user.id,
            reason: 'freelancer_deleted',
          },
        })
      }
    }

    // 2. Delete pending activities & notifications for this user
    await tx.activity.deleteMany({
      where: { agentId: id },
    })
    await tx.notification.deleteMany({
      where: { OR: [{ userId: id }, { sentById: id }] },
    })

    // 3. Delete call attempts and legacy records
    await tx.callAttempt.deleteMany({
      where: { freelancerId: id },
    })
    await tx.interaction.deleteMany({
      where: { freelancerId: id },
    })
    await tx.call.deleteMany({
      where: { agentId: id },
    })
    await tx.assignmentHistory.deleteMany({
      where: { OR: [{ fromUserId: id }, { toUserId: id }, { changedById: id }] },
    })

    // 4. Delete the User account
    await tx.user.delete({
      where: { id },
    })

    // 5. Write to administrative ActivityLog
    await tx.activityLog.create({
      data: {
        actorId: session!.user.id,
        action: 'FREELANCER_DELETED',
        targetType: 'User',
        targetId: id,
        metadata: JSON.stringify({
          deletedUserName: user.name,
          deletedUserEmail: user.email,
          unassignedContactsCount: user.assignedContacts.length,
        }),
      },
    })
  })

  return NextResponse.json({
    success: true,
    message: `Freelancer ${user.name} was successfully removed and ${user.assignedContacts.length} contacts were returned to the unassigned pool.`,
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth('ADMIN')
  if (error) return error
  const { id } = await params
  const { name, email, phone } = await req.json()

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target || target.role !== 'FREELANCER') {
    return NextResponse.json({ error: 'Freelancer not found' }, { status: 404 })
  }

  const data: Record<string, string | null> = {}
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 })
    }
    data.name = name.trim()
  }
  if (email !== undefined) {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing && existing.id !== id) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
    }
    data.email = email.trim()
  }
  if (phone !== undefined) data.phone = phone?.trim() || null

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, phone: true },
  })

  await prisma.activityLog.create({
    data: {
      actorId: session!.user.id,
      action: 'FREELANCER_DETAILS_EDITED',
      targetType: 'User',
      targetId: id,
      metadata: JSON.stringify({ changedFields: Object.keys(data) }),
    },
  })

  return NextResponse.json(updated)
}

