import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/api-utils'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth('ADMIN')
  if (error) return error
  const { id } = await params

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user || user.role !== 'FREELANCER') {
    return NextResponse.json({ error: 'Freelancer not found' }, { status: 404 })
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      freelancerStatus: 'APPROVED',
      reviewedAt: new Date(),
      reviewedById: session!.user.id,
    },
    select: { id: true, name: true, email: true, freelancerStatus: true },
  })

  return NextResponse.json(updated)
}
