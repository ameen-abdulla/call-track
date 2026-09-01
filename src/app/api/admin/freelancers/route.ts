import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/api-utils'
import bcrypt from 'bcryptjs'
import { validatePassword, sanitizeText, normalizeEmail } from '@/lib/password-policy'

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

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth('ADMIN')
  if (error) return error

  const body = await req.json()
  const name = sanitizeText(body.name ?? '')
  const email = normalizeEmail(body.email ?? '')
  const phone = body.phone ? sanitizeText(body.phone) : null
  const password: string = body.password ?? ''
  const applicationNote = body.applicationNote ? sanitizeText(body.applicationNote) : null

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 })
  }

  // Password strength policy
  const pwCheck = validatePassword(password)
  if (!pwCheck.valid) {
    return NextResponse.json({ error: pwCheck.errors[0] }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const freelancer = await prisma.user.create({
    data: {
      name,
      email,
      phone,
      passwordHash,
      role: 'FREELANCER',
      freelancerStatus: 'APPROVED',
      appliedAt: new Date(),
      reviewedAt: new Date(),
      reviewedById: session!.user.id,
      applicationNote: applicationNote || 'Created directly by Admin',
    },
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

  return NextResponse.json(freelancer, { status: 201 })
}
