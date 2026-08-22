import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/api-utils'

export async function GET() {
  const { error } = await requireAuth('ADMIN')
  if (error) return error

  const contacts = await prisma.contact.findMany({
    where: {
      assignedToId: null,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      phone2: true,
      email: true,
      company: true,
      status: true,
      callPriority: true,
      topic: true,
      createdAt: true,
      tags: { select: { tag: { select: { id: true, name: true } } } },
      _count: { select: { calls: true, interactions: true } },
    },
    orderBy: [{ callPriority: 'asc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json(contacts)
}
