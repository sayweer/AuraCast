import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { TransactionVerificationError, AuraCastError } from '@/lib/errors'

const connection = new Connection(
  process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com',
  'confirmed'
)

export async function verifyTransaction(
  txSignature: string,
  expectedRecipient: string,
  expectedLamports: number
): Promise<boolean> {
  const tx = await connection.getTransaction(txSignature, {
    maxSupportedTransactionVersion: 0,
  })

  if (tx === null) throw new TransactionVerificationError(txSignature)
  if (tx.meta?.err !== null && tx.meta?.err !== undefined) {
    throw new TransactionVerificationError(txSignature)
  }

  const accountKeys = tx.transaction.message.getAccountKeys()
  const preBalances = tx.meta?.preBalances ?? []
  const postBalances = tx.meta?.postBalances ?? []

  let recipientIndex = -1
  for (let i = 0; i < accountKeys.length; i++) {
    const key = accountKeys.get(i)
    if (key && key.toBase58() === expectedRecipient) {
      recipientIndex = i
      break
    }
  }

  if (recipientIndex === -1) throw new TransactionVerificationError(txSignature)

  const diff = postBalances[recipientIndex] - preBalances[recipientIndex]
  if (diff < expectedLamports) throw new TransactionVerificationError(txSignature)

  return true
}

export async function getWalletBalance(walletAddress: string): Promise<number> {
  try {
    const balance = await connection.getBalance(new PublicKey(walletAddress))
    return balance / LAMPORTS_PER_SOL
  } catch {
    throw new AuraCastError('Failed to fetch wallet balance', 'WALLET_ERROR', 500)
  }
}

export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL
}

export function solToLamports(sol: number): number {
  return Math.round(sol * LAMPORTS_PER_SOL)
}
