import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/api-utils'
import { UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

export async function GET(req: NextRequest) {
  const { error } = await requireAuth('admin')
  if (error) return error

  const { searchParams } = new URL(req.url)
  const role = searchParams.get('role')
  const where = role ? { role: role.toUpperCase() as UserRole } : {}

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      freelancerStatus: true,
      createdAt: true,
    },
  })
  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const { error } = await requireAuth('admin')
  if (error) return error

  const { name, email, phone, password, role } = await req.json()
  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const roleUpper = role.toUpperCase() === 'ADMIN' ? UserRole.ADMIN : UserRole.FREELANCER
  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone: phone || null,
      passwordHash,
      role: roleUpper,
      freelancerStatus: roleUpper === UserRole.FREELANCER ? 'APPROVED' : null,
    },
    select: { id: true, name: true, email: true, role: true, freelancerStatus: true },
  })
  return NextResponse.json(user, { status: 201 })
}
