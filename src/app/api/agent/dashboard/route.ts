import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/api-utils'

export async function GET() {
  const { error, session } = await requireAuth('agent')
  if (error) return error

  const agentId = session!.user.id
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [todaysCalls, queue, followUps, unreadCount] = await Promise.all([
    // Activities due today
    prisma.activity.findMany({
      where: { agentId, dueDate: { gte: today, lt: tomorrow }, status: { in: ['pending', 'overdue'] } },
      include: { contact: true },
      orderBy: { dueDate: 'asc' },
    }),
    // Queued contacts (assigned but not yet called)
    prisma.contact.findMany({
      where: { assignedToId: agentId, status: { in: ['queued', 'new'] } },
      orderBy: { updatedAt: 'desc' },
    }),
    // Follow-ups due (overdue activities)
    prisma.activity.findMany({
      where: { agentId, status: { in: ['pending', 'overdue'] }, dueDate: { lte: new Date() } },
      include: { contact: true },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.notification.count({ where: { userId: agentId, isRead: false } }),
  ])

  return NextResponse.json({ todaysCalls, queue, followUps, unreadCount })
}
