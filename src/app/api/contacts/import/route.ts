import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/api-utils'

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth('admin')
  if (error) return error

  const formData = await req.formData()
  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const text = await file.text()
  const lines = text.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

  const created: unknown[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',')
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = values[idx]?.trim() ?? '' })
    if (!row.name || !row.phone) continue
    const contact = await prisma.contact.create({
      data: {
        name: row.name,
        phone: row.phone,
        email: row.email || null,
        company: row.company || null,
        source: row.source || 'import',
        createdById: session!.user.id,
      },
    })
    created.push(contact)
  }
  return NextResponse.json({ imported: created.length })
}
