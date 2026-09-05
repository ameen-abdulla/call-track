import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  const { error } = await requireAuth('admin')
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId') || searchParams.get('freelancerId')
    const pageParam = parseInt(searchParams.get('page') || '1', 10)
    const limitParam = parseInt(searchParams.get('limit') || '50', 10)

    const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam
    const limit = isNaN(limitParam) || limitParam < 1 ? 50 : Math.min(limitParam, 200)
    const skip = (page - 1) * limit

    const where: Prisma.CallWhereInput = {
      contact: { deletedAt: null },
    }
    if (userId && userId !== 'all') {
      where.agentId = userId
    }

    const [calls, total] = await Promise.all([
      prisma.call.findMany({
        where,
        include: {
          contact: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              company: true,
              status: true,
            },
          },
          agent: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          activities: {
            select: {
              dueDate: true,
            },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { callTime: 'desc' },
        skip,
        take: limit,
      }),
      prisma.call.count({ where }),
    ])

    const logs = calls.map(call => ({
      id: call.id,
      outcome: call.outcome,
      responseLookup: call.responseLookup,
      recommendedAction: call.recommendedAction,
      interestLevel: call.interestLevel,
      notes: call.feedbackNotes,
      calledAt: call.callTime,
      scheduledAt: call.activities?.[0]?.dueDate || null,
      duration: null,
      contact: call.contact,
      user: call.agent,
    }))

    return NextResponse.json({ logs, total, page, limit })
  } catch (err) {
    console.error('Error fetching admin call logs:', err)
    return NextResponse.json({ error: 'Failed to fetch call logs' }, { status: 500 })
  }
}
