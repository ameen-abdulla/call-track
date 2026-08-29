import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/api-utils'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth('ADMIN')
  if (error) return error
  const { id } = await params

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target || target.role !== 'FREELANCER') {
    return NextResponse.json({ error: 'Freelancer not found' }, { status: 404 })
  }

  const tempPassword = crypto.randomBytes(6).toString('base64url')
  const passwordHash = await bcrypt.hash(tempPassword, 10)

  await prisma.user.update({ where: { id }, data: { passwordHash } })

  await prisma.activityLog.create({
    data: {
      actorId: session!.user.id,
      action: 'FREELANCER_PASSWORD_RESET',
      targetType: 'User',
      targetId: id,
    },
  })

  return NextResponse.json({ tempPassword })
}
