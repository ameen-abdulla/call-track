/**
 * In-memory sliding-window rate limiter.
 * Safe for a single-container (single-process) deployment.
 * Each store entry is automatically pruned once it expires.
 */

interface WindowEntry {
  timestamps: number[]
  lockedUntil?: number
}

const stores = new Map<string, Map<string, WindowEntry>>()

function getStore(name: string): Map<string, WindowEntry> {
  if (!stores.has(name)) stores.set(name, new Map())
  return stores.get(name)!
}

/**
 * Check whether the given key (usually an IP) has exceeded the limit.
 *
 * @param store   Logical name for this limiter (e.g. "login", "register")
 * @param key     Per-request identifier (IP address or email)
 * @param limit   Max allowed requests in the window
 * @param windowMs Window duration in ms
 * @returns { allowed: boolean; retriesLeft: number; retryAfterMs: number }
 */
export function rateLimit(
  store: string,
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retriesLeft: number; retryAfterMs: number } {
  const map = getStore(store)
  const now = Date.now()
  const entry = map.get(key) ?? { timestamps: [] }

  // If hard-locked, reject immediately
  if (entry.lockedUntil && now < entry.lockedUntil) {
    return { allowed: false, retriesLeft: 0, retryAfterMs: entry.lockedUntil - now }
  }

  // Prune timestamps outside the window
  const windowStart = now - windowMs
  entry.timestamps = entry.timestamps.filter(t => t > windowStart)

  if (entry.timestamps.length >= limit) {
    // Lock for the remainder of the window
    const oldestInWindow = entry.timestamps[0]
    const retryAfterMs = oldestInWindow + windowMs - now
    entry.lockedUntil = now + retryAfterMs
    map.set(key, entry)
    return { allowed: false, retriesLeft: 0, retryAfterMs }
  }

  entry.timestamps.push(now)
  map.set(key, entry)

  // Schedule cleanup so the map doesn't grow forever
  setTimeout(() => {
    const e = map.get(key)
    if (e && e.timestamps.every(t => t <= Date.now() - windowMs)) {
      map.delete(key)
    }
  }, windowMs)

  return {
    allowed: true,
    retriesLeft: limit - entry.timestamps.length,
    retryAfterMs: 0,
  }
}

/**
 * Manually reset a key (e.g. after a successful login).
 */
export function resetLimit(store: string, key: string) {
  getStore(store).delete(key)
}
