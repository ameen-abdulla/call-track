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
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim())
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

  function extractEmail(value: string): string | null {
    if (!value) return null
    const parts = value.split(/[;,\s]+/)
    const emailPart = parts.find(p => p.includes('@'))
    return emailPart ? emailPart.trim() : null
  }

  const created: unknown[] = []
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    const values: string[] = []
    let current = ''
    let inQuotes = false
    for (const char of lines[i]) {
      if (char === '"') { inQuotes = !inQuotes }
      else if (char === ',' && !inQuotes) { values.push(current.trim()); current = '' }
      else { current += char }
    }
    values.push(current.trim())

    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = values[idx]?.trim() ?? '' })

    // Support both generic and Qatar CSV column names
    const name = row['school_name'] || row['name'] || ''
    const phone = row['main_phone'] || row['phone'] || ''
    if (!name || !phone) continue

    const phone2 = row['mobile_whatsapp'] || row['phone2'] || null
    const rawEmail = row['public_business_contact'] || row['email'] || ''
    const email = extractEmail(rawEmail) || (rawEmail.includes('@') ? rawEmail : null)
    const company = row['school_name'] || row['company'] || name
    const source = row['tag'] || row['source'] || 'import'
    const targetRole = row['target_role'] || ''
    const decisionMaker = row['decision_maker_name'] || ''
    let topic = row['topic'] || ''
    if (!topic && targetRole) {
      topic = decisionMaker ? `Speak to: ${decisionMaker} — Role: ${targetRole}` : `Target role: ${targetRole}`
    }
    const priority = row['call_priority'] || ''
    const status = priority === 'B' ? 'new' : (priority === 'A' ? 'queued' : 'new')

    const contact = await prisma.contact.create({
      data: {
        name,
        phone,
        phone2: phone2 || null,
        email,
        company,
        source,
        topic: topic || null,
        status,
        createdById: session!.user.id,
      },
    })
    created.push(contact)
  }
  return NextResponse.json({ imported: created.length })
}
