import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

function extractEmail(value: string): string | null {
  if (!value) return null
  // If contains @, extract the email part
  const parts = value.split(/[;,\s]+/)
  const emailPart = parts.find(p => p.includes('@'))
  return emailPart ? emailPart.trim() : null
}

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.replace(/\r/g, '').split('\n').filter(l => l.trim())
  const headers = lines[0].split(',')
  return lines.slice(1).map(line => {
    // Handle commas inside quoted fields
    const values: string[] = []
    let current = ''
    let inQuotes = false
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim())
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h.trim()] = values[i] || '' })
    return row
  })
}

async function main() {
  // ── Users ──────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('admin123', 10)
  const secretaryHash = await bcrypt.hash('secretary123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@calltrack.local' },
    update: {},
    create: { name: 'Admin User', email: 'admin@calltrack.local', passwordHash: adminHash, role: 'admin', status: 'active' },
  })

  const secretary = await prisma.user.upsert({
    where: { email: 'secretary@calltrack.local' },
    update: {},
    create: { name: 'Sarah Secretary', email: 'secretary@calltrack.local', passwordHash: secretaryHash, role: 'agent', status: 'active' },
  })

  // ── Clear existing data (FK order) ─────────────────────────────────
  await prisma.notification.deleteMany()
  await prisma.activity.deleteMany()
  await prisma.call.deleteMany()
  await prisma.contact.deleteMany()
  console.log('Cleared existing contacts, calls, activities, notifications.')

  // ── Read CSV ───────────────────────────────────────────────────────
  // Try in-repo path, relative paths, then absolute
  const csvPaths = [
    path.join(__dirname, 'qatar_education_prospect_master_list.csv'),
    path.join(__dirname, '../prisma/qatar_education_prospect_master_list.csv'),
    path.join(process.cwd(), 'prisma/qatar_education_prospect_master_list.csv'),
    'D:/FamCode/Call Tracker/Sample CSV/qatar_education_prospect_master_list.csv',
    path.join(__dirname, '../../Sample CSV/qatar_education_prospect_master_list.csv'),
    path.join(process.cwd(), '../Sample CSV/qatar_education_prospect_master_list.csv'),
  ]

  let csvContent: string | null = null
  for (const p of csvPaths) {
    if (fs.existsSync(p)) {
      csvContent = fs.readFileSync(p, 'utf-8')
      console.log(`Reading CSV from: ${p}`)
      break
    }
  }

  if (!csvContent) {
    throw new Error('CSV file not found. Tried: ' + csvPaths.join(', '))
  }

  const rows = parseCSV(csvContent)
  console.log(`Parsed ${rows.length} rows from CSV`)

  // ── Create contacts ────────────────────────────────────────────────
  let created = 0
  for (const row of rows) {
    const name = row['school_name']?.trim()
    const phone = row['main_phone']?.trim()
    if (!name || !phone) continue

    const phone2 = row['mobile_whatsapp']?.trim() || null
    const email = extractEmail(row['public_business_contact'] || '')
    const targetRole = row['target_role']?.trim() || ''
    const decisionMaker = row['decision_maker_name']?.trim() || ''
    const priority = row['call_priority']?.trim()
    const tag = row['tag']?.trim() || ''

    let topic = ''
    if (decisionMaker) {
      topic = `Speak to: ${decisionMaker} — Role: ${targetRole}`
    } else if (targetRole) {
      topic = `Target role: ${targetRole}`
    }

    const status = priority === 'B' ? 'new' : 'queued'
    const assignedAgentId = status === 'queued' ? secretary.id : null

    await prisma.contact.create({
      data: {
        name,
        phone,
        phone2,
        email,
        company: name,
        source: tag,
        status,
        topic: topic || null,
        assignedAgentId,
        createdById: admin.id,
      },
    })
    created++
  }

  console.log(`✅ Seeded: 1 admin, 1 secretary, ${created} contacts from CSV`)
  console.log('   admin@calltrack.local / admin123')
  console.log('   secretary@calltrack.local / secretary123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
