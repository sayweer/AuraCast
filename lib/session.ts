import { redis, isRedisAvailable } from '@/lib/redis'
import { randomUUID } from 'crypto'
import { VocliraError } from '@/lib/errors'

// Short-lived, single-use server-side sessions backed by Upstash Redis.
// Used for: upload sessions (presigned-PUT → register binding) and moderation
// sessions (pre-payment moderation → generate binding). getdel guarantees one-time
// consumption, preventing replay across the payment boundary.

function unavailable(): never {
    throw new VocliraError('Session store unavailable', 'SESSION_UNAVAILABLE', 503)
}

// NOTE: @upstash/redis auto-serializes/deserializes values via JSON. Pass objects
// directly — do NOT JSON.stringify (that double-encodes and breaks consume).

/** Creates a session holding `data`, returns its id. Throws if Redis is down. */
export async function createSession<T>(prefix: string, data: T, ttlSeconds: number): Promise<string> {
    if (!isRedisAvailable() || redis === null) unavailable()
    const id = randomUUID()
    await redis.set(`${prefix}:${id}`, data as unknown as Record<string, unknown>, { ex: ttlSeconds })
    return id
}

/** Atomically reads and deletes a session (one-time use). Returns null if missing/expired. */
export async function consumeSession<T>(prefix: string, id: string): Promise<T | null> {
    if (!isRedisAvailable() || redis === null) return null
    const val = await redis.getdel<T>(`${prefix}:${id}`)
    return val ?? null
}
