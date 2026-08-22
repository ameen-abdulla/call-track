import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/api-utils'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth('ADMIN')
  if (error) return error
  const { id } = await params

  const freelancer = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      freelancerStatus: true,
      applicationNote: true,
      appliedAt: true,
      reviewedAt: true,
      suspendedAt: true,
      createdAt: true,
      assignedContacts: {
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          phone: true,
          phone2: true,
          status: true,
          callPriority: true,
          topic: true,
          company: true,
          tags: { select: { tag: { select: { id: true, name: true } } } },
          _count: { select: { calls: true, interactions: true } },
        },
        orderBy: { updatedAt: 'desc' },
      },
      _count: {
        select: {
          assignedContacts: { where: { deletedAt: null } },
          calls: true,
          interactions: true,
        },
      },
    },
  })

  if (!freelancer) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(freelancer)
}
