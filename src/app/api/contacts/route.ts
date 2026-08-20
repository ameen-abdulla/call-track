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

  const where: Record<string, unknown> = {}
  // Agents can only see their own contacts
  if (session!.user.role === 'agent') {
    where.assignedAgentId = session!.user.id
  } else if (agentId) {
    where.assignedAgentId = agentId
  }
  if (status) where.status = status
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { company: { contains: search } },
      { phone: { contains: search } },
    ]
  }

  const contacts = await prisma.contact.findMany({
    where,
    include: { assignedAgent: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(contacts)
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth('admin')
  if (error) return error

  const body = await req.json()
  const { name, phone, email, company, source, status, topic } = body

  if (!name || !phone) {
    return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 })
  }

  const contact = await prisma.contact.create({
    data: { name, phone, email, company, source, status: status || 'new', topic, createdById: session!.user.id },
  })
  return NextResponse.json(contact, { status: 201 })
}
