import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/api-utils'

export async function GET() {
  const { error } = await requireAuth('ADMIN')
  if (error) return error

  const freelancers = await prisma.user.findMany({
    where: { role: 'FREELANCER' },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      freelancerStatus: true,
      applicationNote: true,
      appliedAt: true,
      reviewedAt: true,
      createdAt: true,
      _count: { select: { assignedContacts: true, calls: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(freelancers)
}
