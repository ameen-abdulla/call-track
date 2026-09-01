import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { rateLimit } from '@/lib/rate-limit'
import { validatePassword, sanitizeText, normalizeEmail } from '@/lib/password-policy'

// 3 registrations per IP per hour
const REG_LIMIT = 3
const REG_WINDOW_MS = 60 * 60 * 1000

export async function POST(req: NextRequest) {
  try {
    // Rate-limit by IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const rl = rateLimit('register', ip, REG_LIMIT, REG_WINDOW_MS)
    if (!rl.allowed) {
      const mins = Math.ceil(rl.retryAfterMs / 60000)
      return NextResponse.json(
        { error: `Too many registration attempts. Please try again in ${mins} minute(s).` },
        { status: 429 }
      )
    }

    const body = await req.json()
    const name = sanitizeText(body.name ?? '')
    const email = normalizeEmail(body.email ?? '')
    const phone = body.phone ? sanitizeText(body.phone) : null
    const password: string = body.password ?? ''
    const applicationNote = body.applicationNote ? sanitizeText(body.applicationNote) : null

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 })
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
    await prisma.user.create({
      data: {
        name,
        email,
        phone,
        passwordHash,
        role: 'FREELANCER',
        freelancerStatus: 'PENDING',
        appliedAt: new Date(),
        applicationNote,
      },
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 })
  }
}
