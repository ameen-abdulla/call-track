import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminHash = await bcrypt.hash('admin123', 10)
  const secretaryHash = await bcrypt.hash('secretary123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@calltrack.local' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@calltrack.local',
      passwordHash: adminHash,
      role: 'admin',
      status: 'active',
    },
  })

  const secretary = await prisma.user.upsert({
    where: { email: 'secretary@calltrack.local' },
    update: {},
    create: {
      name: 'Sarah Secretary',
      email: 'secretary@calltrack.local',
      passwordHash: secretaryHash,
      role: 'agent',
      status: 'active',
    },
  })

  const contactsData = [
    { name: 'Ahmed Al-Rashid', phone: '+971501234567', email: 'ahmed@example.com', company: 'Al-Rashid Trading', source: 'website', status: 'queued', topic: 'Introduce our premium logistics package and get their shipping volume details' },
    { name: 'Fatima Hassan', phone: '+971502345678', email: 'fatima@techcorp.ae', company: 'TechCorp UAE', source: 'referral', status: 'queued', topic: 'Follow up on the SaaS demo we sent last week — check if they have questions' },
    { name: 'Mohammed Al-Mansoori', phone: '+971503456789', company: 'Gulf Constructions', source: 'campaign', status: 'new', topic: null },
    { name: 'Layla Ibrahim', phone: '+971504567890', email: 'layla@mediahouse.com', company: 'Media House', source: 'website', status: 'follow_up', topic: 'Discuss the Q4 advertising packages we emailed — she asked for a callback' },
    { name: 'Khalid Bin Zayed', phone: '+971505678901', company: 'Bin Zayed Group', source: 'referral', status: 'queued', topic: 'Pitch the enterprise tier — they have 200+ employees, good upsell opportunity' },
    { name: 'Nour Al-Din', phone: '+971506789012', email: 'nour@startupae.com', company: 'StartupAE', source: 'website', status: 'contacted', topic: 'Check interest in annual plan vs monthly' },
    { name: 'Sara Al-Zaabi', phone: '+971507890123', company: 'Al Zaabi Retail', source: 'campaign', status: 'new', topic: null },
    { name: 'Omar Khalifa', phone: '+971508901234', email: 'omar@khalifainvest.ae', company: 'Khalifa Investments', source: 'referral', status: 'queued', topic: 'Schedule a product demo for their procurement team' },
    { name: 'Reem Al-Hamad', phone: '+971509012345', company: 'Hamad Brothers', source: 'website', status: 'converted', topic: 'Upsell premium support tier — current plan expires next month' },
    { name: 'Tariq Mansour', phone: '+971500123456', email: 'tariq@mansourco.com', company: 'Mansour Co.', source: 'campaign', status: 'lost', topic: 'Re-engage — they went with a competitor 3 months ago, check if they are open to switching' },
  ]

  for (const data of contactsData) {
    await prisma.contact.create({
      data: {
        ...data,
        assignedAgentId: ['queued', 'follow_up', 'contacted'].includes(data.status) ? secretary.id : null,
        createdById: admin.id,
      },
    })
  }

  console.log('✅ Seeded: 1 admin, 1 secretary, 10 contacts')
  console.log('   admin@calltrack.local / admin123')
  console.log('   secretary@calltrack.local / secretary123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
