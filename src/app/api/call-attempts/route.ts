import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/api-utils'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth()
  if (error) return error

  try {
    let body: { contactId?: string } = {}
    const text = await req.text()
    if (text) {
      try {
        body = JSON.parse(text)
      } catch {
        // May be form data or beacon string
        const params = new URLSearchParams(text)
        body = { contactId: params.get('contactId') || undefined }
      }
    }

    const contactId = body.contactId
    if (!contactId) {
      return NextResponse.json({ error: 'contactId is required' }, { status: 400 })
    }

    // Verify contact exists and is not soft-deleted
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, deletedAt: null },
    })

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found or deleted' }, { status: 404 })
    }

    // Spam / Cooldown Deduplication:
    // If a CallAttempt for this contact & freelancer was recorded within the last 60 seconds, reuse it
    const sixtySecondsAgo = new Date(Date.now() - 60 * 1000)
    const existingAttempt = await prisma.callAttempt.findFirst({
      where: {
        contactId,
        freelancerId: session!.user.id,
        triggeredAt: { gte: sixtySecondsAgo },
      },
      orderBy: { triggeredAt: 'desc' },
    })

    if (existingAttempt) {
      return NextResponse.json({
        success: true,
        attemptId: existingAttempt.id,
        triggeredAt: existingAttempt.triggeredAt,
        deduplicated: true,
      })
    }

    const rawIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1'

    const ipHash = crypto.createHash('sha256').update(rawIp).digest('hex').substring(0, 16)
    const userAgent = req.headers.get('user-agent') || 'unknown'

    const attempt = await prisma.callAttempt.create({
      data: {
        contactId,
        freelancerId: session!.user.id,
        method: 'tel_link_click',
        userAgent,
        ipHash,
        triggeredAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, attemptId: attempt.id, triggeredAt: attempt.triggeredAt })
  } catch (err) {
    console.error('Error recording call attempt:', err)
    return NextResponse.json({ error: 'Failed to record call attempt' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { error, session } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const contactId = searchParams.get('contactId')
  if (!contactId) {
    return NextResponse.json({ error: 'contactId required' }, { status: 400 })
  }

  const windowMinutes = parseInt(process.env.CALL_VERIFICATION_WINDOW_MINUTES || '30', 10)
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000)

  const recentAttempt = await prisma.callAttempt.findFirst({
    where: {
      contactId,
      freelancerId: session!.user.id,
      triggeredAt: { gte: windowStart },
    },
    orderBy: { triggeredAt: 'desc' },
  })

  return NextResponse.json({
    verified: Boolean(recentAttempt),
    callAttempt: recentAttempt,
    windowMinutes,
  })
}
