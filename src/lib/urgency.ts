import { prisma } from '@/lib/db'

export type UrgencyStatus = 'green' | 'orange' | 'red' | 'attempted' | 'unassigned' | 'excluded'

export interface ContactUrgency {
  status: UrgencyStatus
  assignedAt: Date | null
  hoursElapsed: number | null
  firstAttemptAt: Date | null
}

export const URGENCY_ELIGIBLE_STATUSES = ['new', 'queued']

export interface ContactUrgencyInput {
  id: string
  assignedToId: string | null
  status: string
  createdAt?: Date | string | null
}

/**
 * Batch-computes urgency for an array of contacts in exactly 2 queries max (no N+1).
 *
 * 1. Partitions contacts into:
 *    - unassigned: contact.assignedToId is null
 *    - excluded: contact.status is not in URGENCY_ELIGIBLE_STATUSES (e.g. 'contacted', 'converted', etc.)
 *    - candidates: assigned contacts awaiting initial outreach
 * 2. Query 1: Fetches all AssignmentHistory rows for candidates in descending order to identify
 *    the exact timestamp when the contact was assigned to its current assignee.
 *    Fallback: uses contact.createdAt if no history record exists for the assignee.
 * 3. Query 2: Coarsely fetches CallAttempt rows where triggeredAt >= min(assignedAt).
 * 4. Strictly checks each candidate in memory against its own assignedAt (triggeredAt >= assignedAt).
 * 5. Returns a Map of contactId -> ContactUrgency.
 */
export async function getContactsUrgency(
  contacts: ContactUrgencyInput[]
): Promise<Map<string, ContactUrgency>> {
  const result = new Map<string, ContactUrgency>()

  if (!contacts || contacts.length === 0) {
    return result
  }

  const candidates: ContactUrgencyInput[] = []
  const candidateMap = new Map<string, ContactUrgencyInput>()

  for (const c of contacts) {
    if (!c.assignedToId) {
      result.set(c.id, {
        status: 'unassigned',
        assignedAt: null,
        hoursElapsed: null,
        firstAttemptAt: null,
      })
    } else if (!URGENCY_ELIGIBLE_STATUSES.includes(c.status)) {
      result.set(c.id, {
        status: 'excluded',
        assignedAt: null,
        hoursElapsed: null,
        firstAttemptAt: null,
      })
    } else {
      candidates.push(c)
      candidateMap.set(c.id, c)
    }
  }

  if (candidates.length === 0) {
    return result
  }

  const candidateIds = candidates.map(c => c.id)

  // Query 1: Get AssignmentHistory for all candidates
  const histories = await prisma.assignmentHistory.findMany({
    where: {
      contactId: { in: candidateIds },
    },
    select: {
      contactId: true,
      toUserId: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // Map each candidate to the start of its CURRENT assignment
  const candidateAssignedAtMap = new Map<string, Date>()
  for (const h of histories) {
    const cand = candidateMap.get(h.contactId)
    if (cand && cand.assignedToId === h.toUserId && !candidateAssignedAtMap.has(h.contactId)) {
      candidateAssignedAtMap.set(h.contactId, h.createdAt)
    }
  }

  // Fallback: If no AssignmentHistory matches current assignee, fallback to contact.createdAt
  for (const cand of candidates) {
    if (!candidateAssignedAtMap.has(cand.id) && cand.createdAt) {
      candidateAssignedAtMap.set(cand.id, new Date(cand.createdAt))
    }
  }

  // Calculate coarse minimum assignedAt for Query 2 pre-filter
  const assignedDates = Array.from(candidateAssignedAtMap.values())
  let attempts: { contactId: string; freelancerId: string; triggeredAt: Date }[] = []

  if (assignedDates.length > 0) {
    const minAssignedAt = new Date(Math.min(...assignedDates.map(d => d.getTime())))

    // Query 2: Batch-fetch call attempts that occurred at or after the earliest assignment in the batch
    attempts = await prisma.callAttempt.findMany({
      where: {
        contactId: { in: candidateIds },
        triggeredAt: { gte: minAssignedAt },
      },
      select: {
        contactId: true,
        freelancerId: true,
        triggeredAt: true,
      },
      orderBy: {
        triggeredAt: 'asc',
      },
    })
  }

  const now = new Date()

  // Evaluate each candidate
  for (const cand of candidates) {
    const assignedAt = candidateAssignedAtMap.get(cand.id)

    if (!assignedAt) {
      // Could not determine assignment timestamp; treat safely as unassigned/neutral
      result.set(cand.id, {
        status: 'unassigned',
        assignedAt: null,
        hoursElapsed: null,
        firstAttemptAt: null,
      })
      continue
    }

    // STRICT PER-CONTACT FILTER:
    // Look for the earliest attempt for this contact that occurred AT OR AFTER its own specific assignedAt
    const contactAttempts = attempts.filter(
      a => a.contactId === cand.id && a.triggeredAt >= assignedAt
    )
    const firstAttempt = contactAttempts.length > 0 ? contactAttempts[0] : null

    if (firstAttempt) {
      const elapsedHours = Math.max(0, (firstAttempt.triggeredAt.getTime() - assignedAt.getTime()) / 3_600_000)
      result.set(cand.id, {
        status: 'attempted',
        assignedAt,
        hoursElapsed: Math.round(elapsedHours * 10) / 10,
        firstAttemptAt: firstAttempt.triggeredAt,
      })
    } else {
      const elapsedHours = Math.max(0, (now.getTime() - assignedAt.getTime()) / 3_600_000)
      let status: UrgencyStatus = 'green'
      if (elapsedHours >= 72) {
        status = 'red'
      } else if (elapsedHours >= 24) {
        status = 'orange'
      }

      result.set(cand.id, {
        status,
        assignedAt,
        hoursElapsed: Math.round(elapsedHours * 10) / 10,
        firstAttemptAt: null,
      })
    }
  }

  return result
}

export function computeUrgencySummary(urgencies: (ContactUrgency | undefined)[]) {
  const summary = { green: 0, orange: 0, red: 0, attempted: 0, unassigned: 0 }
  for (const u of urgencies) {
    if (!u) continue
    if (u.status === 'green') summary.green++
    else if (u.status === 'orange') summary.orange++
    else if (u.status === 'red') summary.red++
    else if (u.status === 'attempted') summary.attempted++
    else if (u.status === 'unassigned') summary.unassigned++
  }
  return summary
}
