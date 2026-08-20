import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/api-utils'

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error
  const tags = await prisma.tag.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { contacts: true } } },
  })
  return NextResponse.json(tags)
}

export async function POST(req: NextRequest) {
  const { error } = await requireAuth('ADMIN')
  if (error) return error
  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  const existing = await prisma.tag.findUnique({ where: { name: name.trim() } })
  if (existing) return NextResponse.json({ error: 'Tag already exists' }, { status: 409 })
  const tag = await prisma.tag.create({ data: { name: name.trim() } })
  return NextResponse.json(tag, { status: 201 })
}
