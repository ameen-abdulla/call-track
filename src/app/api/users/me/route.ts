import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/api-utils'

export async function PUT(req: NextRequest) {
  const { error, session } = await requireAuth()
  if (error) return error

  const { name } = await req.json()
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 })
  }

  const updated = await prisma.user.update({
    where: { id: session!.user.id },
    data: { name: name.trim() },
    select: { id: true, name: true, email: true, role: true },
  })
  return NextResponse.json(updated)
}
