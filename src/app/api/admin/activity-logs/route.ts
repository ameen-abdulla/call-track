import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  const { error } = await requireAuth('ADMIN')
  if (error) return error

  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')
  const actorId = searchParams.get('actorId')
  const targetType = searchParams.get('targetType')
  const limit = parseInt(searchParams.get('limit') || '100', 10)

  const where: Record<string, unknown> = {}
  if (action) where.action = action
  if (actorId) where.actorId = actorId
  if (targetType) where.targetType = targetType

  const logs = await prisma.activityLog.findMany({
    where,
    include: {
      actor: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return NextResponse.json(logs)
}
