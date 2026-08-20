import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/api-utils'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth('ADMIN')
  if (error) return error
  const { id } = await params
  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  const tag = await prisma.tag.update({ where: { id }, data: { name: name.trim() } })
  return NextResponse.json(tag)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth('ADMIN')
  if (error) return error
  const { id } = await params
  await prisma.tag.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
