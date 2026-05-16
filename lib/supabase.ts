import { createClient } from '@supabase/supabase-js'
import type { Creator, Purchase, PurchaseStatus, RegisterCreatorRequest } from '@/types'
import { AuraCastError, CreatorNotFoundError } from '@/lib/errors'

const supabase = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_ANON_KEY ?? ''
)

function dbError(msg: string): never {
  // Log full error detail server-side for debugging
  console.error(`[Supabase] ${msg}`)
  throw new AuraCastError('A database error occurred', 'DB_ERROR', 500)
}

export async function getCreatorByWallet(walletAddress: string): Promise<Creator | null> {
  const { data, error } = await supabase
    .from('creators')
    .select('*')
    .eq('wallet_address', walletAddress)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    dbError(`DB error: ${error.message}`)
  }

  return data as Creator
}

export async function saveCreator(
  data: RegisterCreatorRequest & { voiceId: string }
): Promise<Creator> {
  const { data: row, error } = await supabase
    .from('creators')
    .upsert(
      {
        wallet_address: data.walletAddress,
        creator_name: data.creatorName,
        voice_id: data.voiceId,
        price_lamports: data.priceInLamports,
        language: data.language ?? 'en',
        is_active: true,
        block_adult: true,
        block_profanity: true,
        block_political: true,
      },
      { onConflict: 'wallet_address' }
    )
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new AuraCastError('Creator already registered', 'ALREADY_EXISTS', 409)
    }
    dbError(`DB error: ${error.message}`)
  }

  return row as Creator
}

export async function getPurchaseByTxSignature(txSignature: string): Promise<Purchase | null> {
  const { data, error } = await supabase
    .from('purchases')
    .select('*')
    .eq('tx_signature', txSignature)
    .maybeSingle()

  if (error) dbError(`DB error: ${error.message}`)

  return (data as Purchase | null) ?? null
}

export async function updateCreatorPrice(walletAddress: string, priceInLamports: number): Promise<void> {
  const { error } = await supabase
    .from('creators')
    .update({ price_lamports: priceInLamports })
    .eq('wallet_address', walletAddress)

  if (error) throw new AuraCastError('Failed to update price', 'DB_ERROR', 500)
}

export async function savePurchase(data: {
  buyerWallet: string
  creatorWallet: string
  txSignature: string
  fanText: string
  amountLamports: number
}): Promise<Purchase> {
  const { data: row, error } = await supabase
    .from('purchases')
    .insert({
      buyer_wallet: data.buyerWallet,
      creator_wallet: data.creatorWallet,
      tx_signature: data.txSignature,
      fan_text: data.fanText,
      amount_lamports: data.amountLamports,
      status: 'pending',
    })
    .select()
    .single()

  if (error) dbError(`DB error: ${error.message}`)

  return row as Purchase
}

export async function updatePurchaseStatus(
  txSignature: string,
  status: PurchaseStatus,
  audioUrl?: string
): Promise<void> {
  const payload: Record<string, string> = { status }
  if (audioUrl !== undefined) payload.audio_url = audioUrl

  const { error: updateError } = await supabase
    .from('purchases')
    .update(payload)
    .eq('tx_signature', txSignature)

  if (updateError) dbError(`DB error: ${updateError.message}`)

  if (status === 'completed') {
    const { data: purchase, error: fetchError } = await supabase
      .from('purchases')
      .select('creator_wallet, amount_lamports')
      .eq('tx_signature', txSignature)
      .single()

    if (fetchError) dbError(`DB error: ${fetchError.message}`)

    const { data: creator, error: creatorFetchError } = await supabase
      .from('creators')
      .select('total_earned, total_messages')
      .eq('wallet_address', (purchase as { creator_wallet: string; amount_lamports: number }).creator_wallet)
      .single()

    if (creatorFetchError) dbError(`DB error: ${creatorFetchError.message}`)

    const p = purchase as { creator_wallet: string; amount_lamports: number }
    const c = creator as { total_earned: number; total_messages: number }

    const { error: incError } = await supabase
      .from('creators')
      .update({
        total_earned: c.total_earned + p.amount_lamports,
        total_messages: c.total_messages + 1,
      })
      .eq('wallet_address', p.creator_wallet)

    if (incError) dbError(`DB error: ${incError.message}`)
  }
}

export async function getCreatorStats(
  walletAddress: string
): Promise<{ totalEarned: number; totalMessages: number }> {
  const { data, error } = await supabase
    .from('creators')
    .select('total_earned, total_messages')
    .eq('wallet_address', walletAddress)
    .single()

  if (error) {
    if (error.code === 'PGRST116') throw new CreatorNotFoundError(walletAddress)
    dbError(`DB error: ${error.message}`)
  }

  const row = data as { total_earned: number; total_messages: number }
  return { totalEarned: row.total_earned, totalMessages: row.total_messages }
}

export async function updateCreatorFilters(
  walletAddress: string,
  filters: { blockAdult: boolean; blockProfanity: boolean; blockPolitical: boolean }
): Promise<void> {
  const { error } = await supabase
    .from('creators')
    .update({
      block_adult: filters.blockAdult,
      block_profanity: filters.blockProfanity,
      block_political: filters.blockPolitical,
    })
    .eq('wallet_address', walletAddress)

  if (error) throw new AuraCastError('Failed to update filters', 'DB_ERROR', 500)
}

export async function deleteCreatorVoice(walletAddress: string): Promise<void> {
  const { error } = await supabase
    .from('creators')
    .update({ voice_id: '', is_active: false })
    .eq('wallet_address', walletAddress)

  if (error) throw new AuraCastError('Failed to delete voice', 'DB_ERROR', 500)
}
