import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/api-utils'

export async function GET() {
  const { error, session } = await requireAuth()
  if (error) return error

  const notifications = await prisma.notification.findMany({
    where: { userId: session!.user.id },
    orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
    take: 50,
  })
  return NextResponse.json(notifications)
}
