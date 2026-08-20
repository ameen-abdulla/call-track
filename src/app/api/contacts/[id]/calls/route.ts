import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/api-utils'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth()
  if (error) return error
  const { id } = await params

  const contact = await prisma.contact.findUnique({ where: { id } })
  if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (session!.user.role === 'agent' && contact.assignedAgentId !== session!.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const calls = await prisma.call.findMany({
    where: { contactId: id },
    include: { agent: { select: { name: true } } },
    orderBy: { callTime: 'desc' },
  })
  return NextResponse.json(calls)
}
