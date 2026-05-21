import { PublicKey } from '@solana/web3.js'
import nacl from 'tweetnacl'
import bs58 from 'bs58'
import { redis, isRedisAvailable } from '@/lib/redis'

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

/**
 * Issue a single-use nonce bound to a wallet address. Stored in Redis with TTL.
 * Returns null if Redis is unavailable (caller should fail-secure).
 */
export async function issueAuthNonce(walletAddress: string): Promise<string | null> {
  if (!isRedisAvailable() || redis === null) return null
  const nonce = crypto.randomUUID()
  try {
    await redis.set(`auth:nonce:${nonce}`, walletAddress, { ex: NONCE_TTL_SECONDS })
    return nonce
  } catch (e) {
    console.error('[Auth] Failed to store nonce in Redis:', e)
    return null
  }
}

/**
 * Verify a wallet signature against a previously issued nonce.
 * Consumes the nonce atomically (single-use).
 * Returns false if: nonce missing/expired, wallet mismatch, signature invalid, or Redis unavailable.
 */
export async function verifyWalletAuth(
  walletAddress: string,
  signature: string | null,
  nonce: string | null
): Promise<boolean> {
  if (!signature || !nonce) return false
  if (!isRedisAvailable() || redis === null) return false

  let storedWallet: string | null
  try {
    // Atomic get + delete — prevents replay even within TTL window
    storedWallet = await redis.getdel<string>(`auth:nonce:${nonce}`)
  } catch (e) {
    console.error('[Auth] Failed to consume nonce from Redis:', e)
    return false
  }

  if (storedWallet !== walletAddress) return false

  const message = buildAuthMessage(walletAddress, nonce)
  return verifyWalletSignature(walletAddress, message, signature)
}
