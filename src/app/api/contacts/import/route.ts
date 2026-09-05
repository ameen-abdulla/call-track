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
  // Strip UTF-8 BOM if present and normalize line endings
  const cleanText = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = cleanText.split('\n').filter(l => l.trim())
  if (lines.length < 2) return NextResponse.json({ imported: 0, error: 'CSV has no data rows' }, { status: 400 })

  // Clean and normalize headers
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, ''))

  function extractEmail(value: string): string | null {
    if (!value) return null
    const parts = value.split(/[;,\s]+/)
    const emailPart = parts.find(p => p.includes('@'))
    return emailPart ? emailPart.trim() : null
  }

  // Tag cache to avoid repeated DB lookups
  const tagCache = new Map<string, string>()

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
    headers.forEach((h, idx) => {
      // Remove any surrounding quotes from parsed value
      row[h] = (values[idx] ?? '').trim().replace(/^["']|["']$/g, '')
    })

    // Support both generic and company/b2b CSV column names
    const company = row['company_name'] || row['company'] || row['school_name'] || row['organization'] || row['business_name'] || ''
    const contactPerson = row['key_contact_name'] || row['contact_name'] || row['contact_person'] || row['decision_maker_name'] || ''
    const genericName = row['name'] || ''

    // Use company name as primary contact name, falling back to contact person or generic name
    const name = company || contactPerson || genericName
    if (!name) continue

    // Phone parsing: handle slashes and secondary numbers
    let rawPhone = row['main_phone'] || row['phone'] || row['mobile'] || row['telephone'] || row['phone_number'] || ''
    let rawPhone2 = row['mobile_whatsapp'] || row['phone2'] || row['whatsapp'] || ''

    let phone = ''
    let phone2: string | null = null

    if (rawPhone.includes('/')) {
      const parts = rawPhone.split('/').map(p => p.trim()).filter(Boolean)
      phone = parts[0]
      const extra = parts.slice(1).join(' / ')
      phone2 = rawPhone2 ? `${rawPhone2} (${extra})` : extra
    } else {
      phone = rawPhone.trim()
      phone2 = rawPhone2.trim() || null
    }

    if (!phone && phone2) {
      phone = phone2
      phone2 = null
    }

    if (!phone) continue

    const rawEmail = row['public_business_contact'] || row['email'] || ''
    const email = extractEmail(rawEmail) || (rawEmail.includes('@') ? rawEmail : null)

    const source = row['source'] || 'CSV Import'
    const targetRole = row['target_role'] || ''
    const website = row['website'] || ''
    const linkedin = row['linkedin'] || ''

    // Compile informative talking point / topic
    const topicParts: string[] = []
    if (contactPerson && contactPerson !== name) topicParts.push(`Contact: ${contactPerson}`)
    if (targetRole) topicParts.push(`Role: ${targetRole}`)
    if (website) topicParts.push(`Web: ${website}`)
    if (linkedin) topicParts.push(`LinkedIn: ${linkedin}`)
    const topic = topicParts.join(' · ') || row['topic'] || null

    const priority = (row['call_priority'] || row['priority'] || '').trim().toUpperCase()
    const status = priority === 'B' ? 'new' : (priority === 'A' ? 'queued' : 'new')

    // Handle Category Tag
    const rawTag = (row['tag'] || '').trim()
    let tagId: string | null = null
    if (rawTag) {
      if (tagCache.has(rawTag)) {
        tagId = tagCache.get(rawTag)!
      } else {
        try {
          const tagRecord = await prisma.tag.upsert({
            where: { name: rawTag },
            update: {},
            create: { name: rawTag },
          })
          tagId = tagRecord.id
          tagCache.set(rawTag, tagId)
        } catch (tagErr) {
          console.error('Error creating tag for CSV import:', tagErr)
        }
      }
    }

    try {
      const contact = await prisma.contact.create({
        data: {
          name,
          phone,
          phone2: phone2 || null,
          email,
          company: company || (name !== contactPerson ? contactPerson : null) || null,
          source,
          topic: topic || null,
          callPriority: priority || null,
          status,
          createdById: session!.user.id,
          ...(tagId ? {
            tags: {
              create: [{ tagId }],
            },
          } : {}),
        },
      })
      created.push(contact)
    } catch (err) {
      console.error(`Failed to import contact at line ${i} (${name}):`, err)
    }
  }

  return NextResponse.json({ imported: created.length })
}

