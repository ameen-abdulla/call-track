import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/api-utils'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth('ADMIN')
  if (error) return error
  const { id } = await params

  const existing = await prisma.contact.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })

  const restored = await prisma.$transaction(async (tx) => {
    const contact = await tx.contact.update({
      where: { id },
      data: {
        deletedAt: null,
        status: 'new',
      },
    })

    await tx.activityLog.create({
      data: {
        actorId: session!.user.id,
        action: 'CONTACT_RESTORED',
        targetType: 'Contact',
        targetId: id,
        metadata: JSON.stringify({ contactName: contact.name }),
      },
    })

    return contact
  })

  return NextResponse.json({ success: true, contact: restored })
}
