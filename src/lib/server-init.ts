import { startCronJobs } from './cron'

let started = false

export function initServer() {
  if (typeof window === 'undefined' && !started) {
    startCronJobs()
    started = true
  }
}
