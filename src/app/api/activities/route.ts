import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  const { error, session } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get('agent_id')
  const status = searchParams.get('status')
  const overdue = searchParams.get('overdue') === 'true'

  const where: Record<string, unknown> = {}
  if (session!.user.role === 'FREELANCER') {
    where.agentId = session!.user.id
  } else if (agentId) {
    where.agentId = agentId
  }
  if (status) where.status = status
  if (overdue) where.dueDate = { lt: new Date() }

  const activities = await prisma.activity.findMany({
    where,
    include: { contact: { select: { name: true, phone: true } }, agent: { select: { name: true } } },
    orderBy: { dueDate: 'asc' },
  })
  return NextResponse.json(activities)
}
