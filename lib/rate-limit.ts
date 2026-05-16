// In-memory rate limiting for expensive endpoints.
// TODO: For production, replace with Upstash Redis for persistence across cold starts.

const rateLimitMap = new Map<string, number[]>()

// Periodic cleanup to prevent memory leaks (every 5 minutes)
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000

let lastCleanup = Date.now()

function cleanupStaleEntries(maxAgeMs: number): void {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now

  rateLimitMap.forEach((timestamps, key) => {
    const recent = timestamps.filter((t: number) => now - t < maxAgeMs)
    if (recent.length === 0) {
      rateLimitMap.delete(key)
    } else {
      rateLimitMap.set(key, recent)
    }
  })
}

/**
 * Check if a request is within the rate limit.
 * @returns true if the request is allowed, false if rate-limited.
 */
export function checkRateLimit(
  ip: string,
  maxRequests: number,
  windowMs: number
): boolean {
  cleanupStaleEntries(windowMs)

  const now = Date.now()
  const requests = rateLimitMap.get(ip) ?? []
  const recent = requests.filter((t) => now - t < windowMs)

  if (recent.length >= maxRequests) return false

  rateLimitMap.set(ip, [...recent, now])
  return true
}
