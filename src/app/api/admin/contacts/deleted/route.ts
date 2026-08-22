import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/api-utils'

export async function GET() {
  const { error } = await requireAuth('ADMIN')
  if (error) return error

  const deletedContacts = await prisma.contact.findMany({
    where: {
      deletedAt: { not: null },
    },
    include: {
      tags: { include: { tag: true } },
      createdBy: { select: { name: true } },
      _count: { select: { calls: true, interactions: true } },
    },
    orderBy: { deletedAt: 'desc' },
  })

  return NextResponse.json(deletedContacts)
}
