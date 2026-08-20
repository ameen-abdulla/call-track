import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/api-utils'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth('admin')
  if (error) return error
  const { id } = await params

  const activity = await prisma.activity.findUnique({
    where: { id },
    include: { contact: { select: { name: true } } },
  })
  if (!activity) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const notification = await prisma.notification.create({
    data: {
      userId: activity.agentId,
      type: 'admin_nudge',
      message: `Reminder from Admin: Please follow up with ${activity.contact.name} — activity is overdue.`,
      relatedId: activity.id,
      sentById: session!.user.id,
    },
  })
  return NextResponse.json(notification)
}
