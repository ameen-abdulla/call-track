import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/api-utils'

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth('admin')
  if (error) return error

  let body: { confirmationText?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (body.confirmationText !== 'DELETE ALL DATA') {
    return NextResponse.json({ error: 'Confirmation text did not match' }, { status: 400 })
  }

  const counts = await prisma.$transaction(async (tx) => {
    // Delete in FK-safe order.
    // Interactions reference CallAttempts — must go first.
    const interactions = await tx.interaction.deleteMany({})
    // CallAttempts are now safe to delete.
    const callAttempts = await tx.callAttempt.deleteMany({})
    // Activities reference Calls (optional FK) — delete before Calls.
    const activities = await tx.activity.deleteMany({})
    // Calls are now safe to delete.
    const calls = await tx.call.deleteMany({})
    // AssignmentHistory references Contacts — delete before Contacts.
    const assignmentHistory = await tx.assignmentHistory.deleteMany({})
    // Contacts last — ContactTag rows cascade automatically (onDelete: Cascade).
    const contacts = await tx.contact.deleteMany({})
    // Notifications are standalone — clean up last.
    const notifications = await tx.notification.deleteMany({})

    // NOTE: User, Tag, and ActivityLog are intentionally NOT touched.
    await tx.activityLog.create({
      data: {
        actorId: session!.user.id,
        action: 'DATA_CLEARED',
        targetType: 'System',
        metadata: JSON.stringify({
          contacts: contacts.count,
          calls: calls.count,
          interactions: interactions.count,
          callAttempts: callAttempts.count,
          activities: activities.count,
          assignmentHistory: assignmentHistory.count,
          notifications: notifications.count,
        }),
      },
    })

    return {
      contacts: contacts.count,
      calls: calls.count,
      interactions: interactions.count,
      activities: activities.count,
    }
  })

  return NextResponse.json({ success: true, ...counts })
}