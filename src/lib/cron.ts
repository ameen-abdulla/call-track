import cron from 'node-cron'
import { prisma } from './db'

export function startCronJobs() {
  // Hourly: mark overdue activities and notify agents
  cron.schedule('0 * * * *', async () => {
    console.log('[cron] Running overdue check...')
    try {
      const overdue = await prisma.activity.findMany({
        where: { status: 'pending', dueDate: { lt: new Date() } },
        include: { contact: { select: { name: true } } },
      })
      for (const activity of overdue) {
        await prisma.activity.update({ where: { id: activity.id }, data: { status: 'overdue' } })
        await prisma.notification.create({
          data: {
            userId: activity.agentId,
            type: 'overdue_reminder',
            message: `Overdue follow-up: ${activity.contact.name} — ${activity.activityType} was due ${activity.dueDate.toLocaleDateString()}`,
            relatedId: activity.id,
          },
        })
      }
      console.log(`[cron] Marked ${overdue.length} activities as overdue`)
    } catch (err) {
      console.error('[cron] Error running overdue check:', err)
    }
  })

  // Daily 8am: remind agents of activities due today
  cron.schedule('0 8 * * *', async () => {
    console.log('[cron] Running daily due-today reminder...')
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const dueToday = await prisma.activity.findMany({
        where: { status: 'pending', dueDate: { gte: today, lt: tomorrow } },
        include: { contact: { select: { name: true } } },
      })
      for (const activity of dueToday) {
        await prisma.notification.create({
          data: {
            userId: activity.agentId,
            type: 'system',
            message: `Due today: ${activity.activityType} with ${activity.contact.name}`,
            relatedId: activity.id,
          },
        })
      }
      console.log(`[cron] Sent ${dueToday.length} due-today reminders`)
    } catch (err) {
      console.error('[cron] Error running daily reminder:', err)
    }
  })
}
