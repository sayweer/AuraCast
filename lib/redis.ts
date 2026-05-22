import { Redis } from '@upstash/redis'

const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN

let client: Redis | null = null

if (redisUrl && redisToken) {
  try {
    client = new Redis({ url: redisUrl, token: redisToken })
  } catch (e) {
    console.error('[Redis] Failed to initialize Upstash client:', e)
  }
} else {
  console.warn('[Redis] Redis environment variables missing — auth nonce will fail-secure')
}

export const redis = client
export const isRedisAvailable = (): boolean => client !== null
