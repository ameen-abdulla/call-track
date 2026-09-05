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
  const bucket = searchParams.get('bucket')
  const contactId = searchParams.get('contactId')
  const dateParam = searchParams.get('date') // YYYY-MM-DD for calendar day view

  const now = new Date()
  const startToday = new Date(now)
  startToday.setHours(0, 0, 0, 0)
  const endToday = new Date(startToday)
  endToday.setHours(23, 59, 59, 999)

  const in7Days = new Date(now)
  in7Days.setDate(in7Days.getDate() + 7)

  const in8Days = new Date(now)
  in8Days.setDate(in8Days.getDate() + 8)

  const in30Days = new Date(now)
  in30Days.setDate(in30Days.getDate() + 30)

  const where: Record<string, unknown> = {
    contact: { deletedAt: null },
  }

  if (session!.user.role === 'FREELANCER') {
    where.agentId = session!.user.id
  } else if (agentId) {
    where.agentId = agentId
  }

  // Optional contact filter (used by calendar contact filter)
  if (contactId) {
    where.contactId = contactId
  }

  // Calendar day view: filter to a single day
  if (dateParam) {
    const dayStart = new Date(dateParam)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayEnd.getDate() + 1)
    where.dueDate = { gte: dayStart, lt: dayEnd }
  } else if (bucket === 'overdue') {
    where.status = { in: ['pending', 'overdue'] }
    where.dueDate = { lt: new Date() }
  } else {
    if (status) where.status = status
    if (bucket === 'dueToday') {
      where.dueDate = { gte: startToday, lte: endToday }
    } else if (bucket === 'next7Days') {
      where.dueDate = { gte: now, lte: in7Days }
    } else if (bucket === 'days8to30') {
      where.dueDate = { gte: in8Days, lte: in30Days }
    } else if (bucket === 'days31Plus') {
      where.dueDate = { gt: in30Days }
    } else if (overdue) {
      where.dueDate = { lt: new Date() }
    }
  }

  const activities = await prisma.activity.findMany({
    where,
    include: { contact: { select: { id: true, name: true, phone: true } }, agent: { select: { name: true } } },
    orderBy: { dueDate: 'asc' },
  })
  return NextResponse.json(activities)
}
