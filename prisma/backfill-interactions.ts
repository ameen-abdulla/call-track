import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Checking for existing Call records to backfill into Interaction table...')
  
  const calls = await prisma.call.findMany({
    include: {
      activities: true,
    },
  })

  console.log(`Found ${calls.length} Call records.`)

  let migratedCount = 0

  for (const call of calls) {
    // Check if interaction already exists for this call
    const existing = await prisma.interaction.findFirst({
      where: {
        contactId: call.contactId,
        freelancerId: call.agentId,
        occurredAt: call.callTime,
      },
    })

    if (!existing) {
      const latestActivity = call.activities[0]
      const isConnected = call.outcome === 'connected' ? true : ['no_answer', 'busy', 'wrong_number'].includes(call.outcome) ? false : null

      await prisma.interaction.create({
        data: {
          contactId: call.contactId,
          freelancerId: call.agentId,
          type: 'CALL',
          connected: isConnected,
          response: call.responseLookup || (call.outcome === 'connected' ? 'Connected' : call.outcome),
          interestArea: null,
          nextActivityRequired: Boolean(latestActivity),
          nextActivityDate: latestActivity?.dueDate || null,
          nextActivity: latestActivity?.activityType || null,
          notes: call.feedbackNotes || null,
          occurredAt: call.callTime,
          createdAt: call.createdAt,
        },
      })
      migratedCount++
    }
  }

  console.log(`✅ Successfully backfilled ${migratedCount} Call records into Interaction table.`)
}

main()
  .catch((e) => {
    console.error('❌ Error during backfill:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
