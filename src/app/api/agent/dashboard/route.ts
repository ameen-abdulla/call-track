import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/api-utils'
import { getContactsUrgency, computeUrgencySummary } from '@/lib/urgency'

export async function GET() {
  const { error, session } = await requireAuth('FREELANCER')
  if (error) return error

  const agentId = session!.user.id
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [todaysCalls, queue, followUps, unreadCount] = await Promise.all([
    // Activities due today
    prisma.activity.findMany({
      where: {
        agentId,
        dueDate: { gte: today, lt: tomorrow },
        status: { in: ['pending', 'overdue'] },
        contact: { deletedAt: null },
      },
      include: { contact: { include: { tags: { include: { tag: true } } } } },
      orderBy: { dueDate: 'asc' },
    }),
    // Queued contacts (assigned but not yet called)
    prisma.contact.findMany({
      where: { assignedToId: agentId, status: { in: ['queued', 'new'] }, deletedAt: null },
      include: { tags: { include: { tag: true } } },
      orderBy: [{ callPriority: 'asc' }, { updatedAt: 'desc' }],
    }),
    // Follow-ups due (overdue activities)
    prisma.activity.findMany({
      where: {
        agentId,
        status: { in: ['pending', 'overdue'] },
        dueDate: { lte: new Date() },
        contact: { deletedAt: null },
      },
      include: { contact: { include: { tags: { include: { tag: true } } } } },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.notification.count({ where: { userId: agentId, isRead: false } }),
  ])

  const urgencyMap = await getContactsUrgency(queue)
  const queueWithUrgency = queue.map(c => ({
    ...c,
    urgency: urgencyMap.get(c.id) || {
      status: 'unassigned',
      assignedAt: null,
      hoursElapsed: null,
      firstAttemptAt: null,
    },
  }))

  const urgencySummary = computeUrgencySummary(queueWithUrgency.map(c => c.urgency))

  return NextResponse.json({
    todaysCalls,
    queue: queueWithUrgency,
    followUps,
    unreadCount,
    urgencySummary: {
      green: urgencySummary.green,
      orange: urgencySummary.orange,
      red: urgencySummary.red,
      attempted: urgencySummary.attempted,
    },
  })
}
