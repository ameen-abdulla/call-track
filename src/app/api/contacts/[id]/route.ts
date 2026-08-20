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
      assignedAgent: { select: { id: true, name: true } },
      calls: { orderBy: { callTime: 'desc' }, include: { agent: { select: { name: true } } } },
      activities: { orderBy: { dueDate: 'asc' }, include: { agent: { select: { name: true } } } },
    },
  })
  if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Agents can only see their own contacts
  if (session!.user.role === 'agent' && contact.assignedAgentId !== session!.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return NextResponse.json(contact)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth()
  if (error) return error
  const { id } = await params

  const contact = await prisma.contact.findUnique({ where: { id } })
  if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (session!.user.role === 'agent' && contact.assignedAgentId !== session!.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const updated = await prisma.contact.update({ where: { id }, data: body })
  return NextResponse.json(updated)
}
