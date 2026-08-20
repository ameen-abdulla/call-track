import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/api-utils'

export async function GET() {
  const { error } = await requireAuth('admin')
  if (error) return error

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [totalContacts, callsToday, overdueFollowUps, convertedContacts, agents] = await Promise.all([
    prisma.contact.count(),
    prisma.call.count({ where: { callTime: { gte: today, lt: tomorrow } } }),
    prisma.activity.count({ where: { status: 'overdue' } }),
    prisma.contact.count({ where: { status: 'converted' } }),
    prisma.user.findMany({
      where: { role: 'FREELANCER', freelancerStatus: 'APPROVED' },
      select: { id: true, name: true },
    }),
  ])

  const conversionRate = totalContacts > 0 ? Math.round((convertedContacts / totalContacts) * 100) : 0

  const overdueList = await prisma.activity.findMany({
    where: { status: 'overdue' },
    include: {
      contact: { select: { name: true, phone: true } },
      agent: { select: { name: true } },
    },
    orderBy: { dueDate: 'asc' },
    take: 50,
  })

  return NextResponse.json({
    kpis: { totalContacts, callsToday, conversionRate, overdueFollowUps },
    overdueList,
    agents,
  })
}
