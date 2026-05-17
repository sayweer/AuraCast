import { PublicKey } from '@solana/web3.js'
import nacl from 'tweetnacl'
import bs58 from 'bs58'

/**
 * Verify that a wallet owner signed a message.
 * Uses Ed25519 signature verification via tweetnacl.
 *
 * @param walletAddress - Solana wallet address (base58 public key)
 * @param message - The plain-text message that was signed
 * @param signature - The base58-encoded signature from the wallet
 * @returns true if the signature is valid for this wallet + message
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

/** The fixed message that clients must sign to prove wallet ownership */
export const AUTH_MESSAGE = 'AuraCast: Verify wallet ownership'
