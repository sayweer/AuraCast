import { PublicKey } from '@solana/web3.js'
import nacl from 'tweetnacl'
import bs58 from 'bs58'
import { redis, isRedisAvailable } from '@/lib/redis'
import { createHmac, randomUUID } from 'crypto'

const NONCE_TTL_SECONDS = 5 * 60 // 5 minutes

/**
 * Verify that a wallet owner signed a message.
 * Uses Ed25519 signature verification via tweetnacl.
 */
export function verifyWalletSignature(
  walletAddress: string,
  message: string,
  signature: string
): boolean {
  try {
    const pubKey = new PublicKey(walletAddress)
    const messageBytes = new TextEncoder().encode(message)
    const signatureBytes = bs58.decode(signature)
    return nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      pubKey.toBytes()
    )
  } catch {
    return false
  }
}

export function buildAuthMessage(walletAddress: string, nonce: string): string {
  return `AuraCast: Verify wallet ownership\nWallet: ${walletAddress}\nNonce: ${nonce}`
}

const NONCE_SECRET = process.env.SUPABASE_ANON_KEY || 'auracast-default-secret-key'

function generateHmac(data: string): string {
  return createHmac('sha256', NONCE_SECRET).update(data).digest('hex')
}

/**
 * Issue a single-use nonce bound to a wallet address. Stored in Redis with TTL.
 * Falls back to a secure signed stateless nonce if Redis is unavailable.
 */
export async function issueAuthNonce(walletAddress: string): Promise<string | null> {
  const uuid = randomUUID()

  if (isRedisAvailable() && redis !== null) {
    try {
      await redis.set(`auth:nonce:${uuid}`, walletAddress, { ex: NONCE_TTL_SECONDS })
      return uuid
    } catch (e) {
      console.warn('[Auth] Failed to store nonce in Redis, falling back to stateless nonce:', e)
    }
  }

  // Stateless fallback: payload signed using SUPABASE_ANON_KEY secret
  const expiresAt = Date.now() + NONCE_TTL_SECONDS * 1000
  const payload = `${walletAddress}:${expiresAt}:${uuid}`
  const hmacSig = generateHmac(payload)
  return `stateless:${payload}:${hmacSig}`
}

/**
 * Verify a wallet signature against a previously issued nonce.
 * Consumes stateful nonces atomically. Verifies signed stateless nonces against expiration.
 */
export async function verifyWalletAuth(
  walletAddress: string,
  signature: string | null,
  nonce: string | null
): Promise<boolean> {
  if (!signature || !nonce) return false

  let isValidNonce = false

  if (nonce.startsWith('stateless:')) {
    try {
      const parts = nonce.split(':')
      if (parts.length === 5) {
        const [_, storedWallet, expiresAtStr, uuid, hmacSig] = parts
        if (storedWallet === walletAddress) {
          const expiresAt = parseInt(expiresAtStr, 10)
          if (!isNaN(expiresAt) && Date.now() <= expiresAt) {
            const payload = `${storedWallet}:${expiresAtStr}:${uuid}`
            const expectedSig = generateHmac(payload)
            if (hmacSig === expectedSig) {
              isValidNonce = true
            }
          }
        }
      }
    } catch (err) {
      console.error('[Auth] Failed to verify stateless nonce:', err)
      return false
    }
  } else {
    if (!isRedisAvailable() || redis === null) return false
    try {
      // Atomic get + delete — prevents replay even within TTL window
      const storedWallet = await redis.getdel<string>(`auth:nonce:${nonce}`)
      if (storedWallet === walletAddress) {
        isValidNonce = true
      }
    } catch (e) {
      console.error('[Auth] Failed to consume nonce from Redis:', e)
      return false
    }
  }

  if (!isValidNonce) return false

  const message = buildAuthMessage(walletAddress, nonce)
  return verifyWalletSignature(walletAddress, message, signature)
}

const SESSION_TTL_SECONDS = 24 * 60 * 60 // 1 day session duration

export function generateSessionToken(walletAddress: string): string {
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000
  const payloadObj = { walletAddress, expiresAt }
  const payloadBase64 = Buffer.from(JSON.stringify(payloadObj)).toString('base64')
  const payloadBase64Url = payloadBase64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const signature = generateHmac(payloadBase64Url)
  return `${payloadBase64Url}.${signature}`
}

export function verifySessionToken(token: string, expectedWallet: string): boolean {
  try {
    const parts = token.split('.')
    if (parts.length !== 2) return false
    const [payloadBase64Url, signature] = parts
    const expectedSig = generateHmac(payloadBase64Url)
    if (signature !== expectedSig) return false

    let base64 = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4) {
      base64 += '='
    }

    const payloadJson = Buffer.from(base64, 'base64').toString('utf8')
    const payload = JSON.parse(payloadJson) as { walletAddress: string; expiresAt: number }

    if (payload.walletAddress.toLowerCase() !== expectedWallet.toLowerCase()) return false
    if (Date.now() > payload.expiresAt) return false

    return true
  } catch {
    return false
  }
}

export async function verifyWalletAuthOrSession(
  walletAddress: string,
  headers: Headers
): Promise<boolean> {
  const authHeader = headers.get('authorization')
  let sessionToken = headers.get('x-session-token')
  if (!sessionToken && authHeader?.startsWith('Bearer ')) {
    sessionToken = authHeader.substring(7)
  }

  if (sessionToken) {
    if (verifySessionToken(sessionToken, walletAddress)) {
      return true
    }
  }

  const signature = headers.get('x-wallet-signature')
  const nonce = headers.get('x-wallet-nonce')
  return verifyWalletAuth(walletAddress, signature, nonce)
}
