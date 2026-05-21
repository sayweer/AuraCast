import { Redis } from '@upstash/redis'

const redisUrl = process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

let client: Redis | null = null

if (redisUrl && redisToken) {
  try {
    client = new Redis({ url: redisUrl, token: redisToken })
  } catch (e) {
    console.error('[Redis] Failed to initialize Upstash client:', e)
  }
} else {
  console.warn('[Redis] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN missing — auth nonce will fail-secure')
}

export const redis = client
export const isRedisAvailable = (): boolean => client !== null
