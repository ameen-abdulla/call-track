import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/api-utils'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth('admin')
  if (error) return error
  const { id } = await params

  const { agentId, topic } = await req.json()
  if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 })

  const contact = await prisma.contact.update({
    where: { id },
    data: { assignedAgentId: agentId, topic, status: 'queued' },
  })

  // Create assignment notification
  await prisma.notification.create({
    data: {
      userId: agentId,
      type: 'assignment',
      message: `You have been assigned a new contact: ${contact.name}${topic ? ` — Topic: ${topic}` : ''}`,
      relatedId: contact.id,
      sentById: session!.user.id,
    },
  })

  return NextResponse.json(contact)
}
