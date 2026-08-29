import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/api-utils'
import { getContactsUrgency } from '@/lib/urgency'

export async function GET(req: NextRequest) {
  const { error, session } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const agentId = searchParams.get('agent_id') || searchParams.get('assignedToId')
  const assignment = searchParams.get('assignment') // 'all' | 'assigned' | 'unassigned' | specific freelancer ID
  const search = searchParams.get('search')?.trim()
  const tagId = searchParams.get('tagId') || searchParams.get('tag')
  const callPriority = searchParams.get('callPriority') || searchParams.get('priority')

  let baseWhere: Record<string, unknown> = {}

  if (session!.user.role === 'FREELANCER') {
    baseWhere = { assignedToId: session!.user.id }
  } else {
    // Admin filtering
    if (assignment === 'unassigned') {
      baseWhere = { assignedToId: null }
    } else if (assignment === 'assigned') {
      baseWhere = { assignedToId: { not: null } }
    } else if (assignment && assignment !== 'all') {
      baseWhere = { assignedToId: assignment }
    } else if (agentId) {
      baseWhere = { assignedToId: agentId }
    }
  }

  // merge baseWhere with search/status/tag/priority filters and ensure soft-deleted contacts are excluded
  const where: Record<string, unknown> = {
    ...baseWhere,
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(tagId ? { tags: { some: { tagId } } } : {}),
    ...(callPriority ? { callPriority } : {}),
  }

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { phone: { contains: search } },
      { phone2: { contains: search } },
      { company: { contains: search } },
      { email: { contains: search } },
      { source: { contains: search } },
      { topic: { contains: search } },
      { assignedTo: { name: { contains: search } } },
      { tags: { some: { tag: { name: { contains: search } } } } },
    ]
  }

  const contacts = await prisma.contact.findMany({
    where,
    include: {
      tags: { include: { tag: true } },
      assignedTo: { select: { id: true, name: true, email: true, freelancerStatus: true } },
      _count: { select: { calls: true, interactions: true } },
    },
    orderBy: [{ callPriority: 'asc' }, { updatedAt: 'desc' }],
  })

  const urgencyMap = await getContactsUrgency(contacts)
  const contactsWithUrgency = contacts.map(c => ({
    ...c,
    urgency: urgencyMap.get(c.id) || {
      status: 'unassigned',
      assignedAt: null,
      hoursElapsed: null,
      firstAttemptAt: null,
    },
  }))

  return NextResponse.json(contactsWithUrgency)
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth('admin')
  if (error) return error

  const body = await req.json()
  const { name, phone, phone2, email, company, source, status, topic, callPriority, assignedToId, tagIds } = body

  if (!name || !phone) {
    return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 })
  }

  const contact = await prisma.$transaction(async (tx) => {
    const newContact = await tx.contact.create({
      data: {
        name,
        phone,
        phone2: phone2 || null,
        email,
        company,
        source,
        status: status || (assignedToId ? 'queued' : 'new'),
        topic,
        callPriority: callPriority || null,
        assignedToId: assignedToId || null,
        createdById: session!.user.id,
        ...(tagIds && Array.isArray(tagIds) && tagIds.length > 0 ? {
          tags: {
            create: tagIds.map((tId: string) => ({ tagId: tId })),
          },
        } : {}),
      },
      include: {
        tags: { include: { tag: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    })

    if (assignedToId) {
      await tx.assignmentHistory.create({
        data: {
          contactId: newContact.id,
          fromUserId: null,
          toUserId: assignedToId,
          changedById: session!.user.id,
          reason: 'contact_created',
        },
      })
    }

    await tx.activityLog.create({
      data: {
        actorId: session!.user.id,
        action: 'CONTACT_CREATED',
        targetType: 'Contact',
        targetId: newContact.id,
        metadata: JSON.stringify({ contactName: newContact.name, assignedToId }),
      },
    })

    return newContact
  })

  return NextResponse.json(contact, { status: 201 })
}
