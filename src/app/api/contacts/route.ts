import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  const { error, session } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const agentId = searchParams.get('agent_id')
  const search = searchParams.get('search')

  const baseWhere = session!.user.role === 'FREELANCER'
    ? { assignedToId: session!.user.id }
    : (agentId ? { assignedToId: agentId } : {})

  // merge baseWhere with any search/status filters
  const where = {
    ...baseWhere,
    ...(search ? {
      OR: [
        { name: { contains: search } },
        { phone: { contains: search } },
        { phone2: { contains: search } },
        { company: { contains: search } },
        { email: { contains: search } },
      ],
    } : {}),
    ...(status ? { status } : {}),
  }

  const contacts = await prisma.contact.findMany({
    where,
    include: {
      tags: { include: { tag: true } },
      assignedTo: { select: { id: true, name: true } },
    },
    orderBy: [{ callPriority: 'asc' }, { updatedAt: 'desc' }],
  })

  return NextResponse.json(contacts)
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth('admin')
  if (error) return error

  const body = await req.json()
  const { name, phone, phone2, email, company, source, status, topic, callPriority } = body

  if (!name || !phone) {
    return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 })
  }

  const contact = await prisma.contact.create({
    data: {
      name,
      phone,
      phone2: phone2 || null,
      email,
      company,
      source,
      status: status || 'new',
      topic,
      callPriority: callPriority || null,
      createdById: session!.user.id,
    },
  })
  return NextResponse.json(contact, { status: 201 })
}
