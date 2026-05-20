import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

// In-memory fallback map for local development or if Upstash is down
const rateLimitMap = new Map<string, number[]>()
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
 * Fallback in-memory rate limiter
 */
function checkRateLimitInMemory(
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

// Upstash Redis setup
let redis: Redis | null = null
const redisUrl = process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

if (redisUrl && redisToken) {
  try {
    redis = new Redis({
      url: redisUrl,
      token: redisToken,
    })
  } catch (e) {
    console.error('[RateLimit] Failed to initialize Upstash Redis client:', e)
  }
}

// Cache Ratelimit instances by limit and window duration
const ratelimitCache = new Map<string, Ratelimit>()

function getRatelimitInstance(maxRequests: number, windowMs: number): Ratelimit | null {
  if (!redis) return null
  const cacheKey = `${maxRequests}:${windowMs}`
  let instance = ratelimitCache.get(cacheKey)
  if (!instance) {
    instance = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(maxRequests, `${windowMs} ms`),
      analytics: false, // Disable analytics for lowest latency
    })
    ratelimitCache.set(cacheKey, instance)
  }
  return instance
}

/**
 * Check if a request is within the rate limit.
 * Falls back gracefully to in-memory rate limiting if Upstash Redis is unavailable.
 * @returns true if the request is allowed, false if rate-limited.
 */
export async function checkRateLimit(
  ip: string,
  maxRequests: number,
  windowMs: number
): Promise<boolean> {
  if (redis) {
    try {
      const ratelimit = getRatelimitInstance(maxRequests, windowMs)
      if (ratelimit) {
        // Use a unique namespace combining the limits to avoid collisions across endpoints
        const limitKey = `ratelimit:${maxRequests}:${windowMs}:${ip}`
        const { success } = await ratelimit.limit(limitKey)
        return success
      }
    } catch (e) {
      console.warn('[RateLimit] Upstash rate limiting failed, falling back to in-memory:', e)
    }
  }

  return checkRateLimitInMemory(ip, maxRequests, windowMs)
}
