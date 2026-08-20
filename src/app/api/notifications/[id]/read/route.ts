import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/api-utils'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth()
  if (error) return error
  const { id } = await params

  const notification = await prisma.notification.findUnique({ where: { id } })
  if (!notification || notification.userId !== session!.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const updated = await prisma.notification.update({ where: { id }, data: { isRead: true } })
  return NextResponse.json(updated)
}
