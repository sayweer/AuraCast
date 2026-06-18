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

/** Creates a session holding `data`, returns its id. Throws if Redis is down. */
export async function createSession<T>(prefix: string, data: T, ttlSeconds: number): Promise<string> {
    if (!isRedisAvailable() || redis === null) unavailable()
    const id = randomUUID()
    await redis.set(`${prefix}:${id}`, JSON.stringify(data), { ex: ttlSeconds })
    return id
}

/** Atomically reads and deletes a session (one-time use). Returns null if missing/expired. */
export async function consumeSession<T>(prefix: string, id: string): Promise<T | null> {
    if (!isRedisAvailable() || redis === null) return null
    const raw = await redis.getdel<string>(`${prefix}:${id}`)
    if (!raw) return null
    try {
        return JSON.parse(raw) as T
    } catch {
        return null
    }
}
