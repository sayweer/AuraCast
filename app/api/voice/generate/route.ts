import { NextRequest, NextResponse } from 'next/server'
import { getCreatorByWallet, savePurchase, updatePurchaseStatus, getPurchaseByTxSignature } from '@/lib/supabase'
import { verifyTransaction } from '@/lib/solana'
import { validateTextLength, isSafeToGenerate } from '@/lib/moderation'
import { generateSpeech, getTtsModel } from '@/lib/elevenlabs'
import { optimizeTextForVoice, MOOD_VOICE_PRESETS } from '@/lib/text-optimizer'
import { getErrorResponse, UnsafeContentError } from '@/lib/errors'
import { safeParseJson, isValidWalletAddress, isValidTxSignature, getClientIp } from '@/lib/validation'
import { checkRateLimit } from '@/lib/rate-limit'
import type { GenerateVoiceRequest, Mood } from '@/types'

const VALID_MOODS: Mood[] = ['happy', 'excited', 'calm', 'sad', 'angry', 'romantic']

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Rate limit: max 5 requests per IP per minute
  const ip = getClientIp(req)
  if (!await checkRateLimit(ip, 5, 60_000)) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' },
      { status: 429 }
    )
  }

  // Safe JSON parsing
  const body = await safeParseJson<Partial<GenerateVoiceRequest>>(req)
  if (body === null) {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  const { creatorWallet, fanText, txSignature, buyerWallet, mood: rawMood } = body

  // Field presence checks
  if (!creatorWallet || !fanText || !txSignature || !buyerWallet) {
    return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
  }

  // Mood validation — optional, defaults to 'calm'
  const mood: Mood = rawMood && VALID_MOODS.includes(rawMood as Mood)
    ? (rawMood as Mood)
    : 'calm'

  // Input format validation
  if (!isValidWalletAddress(creatorWallet)) {
    return NextResponse.json({ success: false, error: 'Invalid creator wallet address' }, { status: 400 })
  }
  if (!isValidWalletAddress(buyerWallet)) {
    return NextResponse.json({ success: false, error: 'Invalid buyer wallet address' }, { status: 400 })
  }
  if (!isValidTxSignature(txSignature)) {
    return NextResponse.json({ success: false, error: 'Invalid transaction signature' }, { status: 400 })
  }
  if (typeof fanText !== 'string' || fanText.trim().length < 5 || fanText.trim().length > 300) {
    return NextResponse.json({ success: false, error: 'Text must be between 5 and 300 characters' }, { status: 400 })
  }

  try {
    validateTextLength(fanText)

    const existing = await getPurchaseByTxSignature(txSignature)
    if (existing !== null) {
      if (existing.status === 'completed' && existing.audio_url) {
        return NextResponse.json(
          { success: true, audioBase64: existing.audio_url, purchaseId: existing.id },
          { status: 200 }
        )
      }
      return NextResponse.json(
        { success: false, error: 'Transaction already processed', code: 'DUPLICATE_TX' },
        { status: 409 }
      )
    }

    const creator = await getCreatorByWallet(creatorWallet)
    if (creator === null) {
      return NextResponse.json({ success: false, error: 'Creator not found' }, { status: 404 })
    }
    if (!creator.is_active) {
      return NextResponse.json({ success: false, error: 'Creator is not active' }, { status: 403 })
    }

    await verifyTransaction(txSignature, creatorWallet, creator.price_lamports, buyerWallet)

    const platformFeeLamports = Math.floor(creator.price_lamports * 0.1)

    const purchase = await savePurchase({
      buyerWallet,
      creatorWallet,
      txSignature,
      fanText,
      amountLamports: creator.price_lamports,
      platformFeeLamports,
    })

    // From this point on, the purchase row exists in 'pending' state.
    // If anything below throws, the outer catch marks it 'rejected' so it
    // never stays stuck and the dashboard / refund logic can act on it.
    try {
      try {
        await isSafeToGenerate(fanText, {
          blockAdult: creator.block_adult,
          blockProfanity: creator.block_profanity,
          blockPolitical: creator.block_political,
        })
      } catch (moderationError) {
        if (moderationError instanceof UnsafeContentError) {
          await updatePurchaseStatus(
            txSignature,
            'rejected',
            undefined,
            `${moderationError.category}: ${moderationError.reason}`
          )
          return NextResponse.json(
            { success: false, error: 'Content violates creator brand safety policy', refundNeeded: true },
            { status: 422 }
          )
        }
        throw moderationError
      }

      const targetModel = getTtsModel()
      const optimizedText = await optimizeTextForVoice(fanText, mood, creator.language, targetModel)

      const result = await generateSpeech({
        voiceId: creator.voice_id,
        text: optimizedText,
        language: creator.language,
        voiceSettings: MOOD_VOICE_PRESETS[mood],
      })

      if (result.modelUsed !== targetModel) {
        console.warn('[VoiceGenerate] TTS fell back to alternate model', {
          requested: targetModel,
          used: result.modelUsed,
          voiceId: creator.voice_id,
        })
      } else {
        console.log('[VoiceGenerate] TTS completed', {
          modelUsed: result.modelUsed,
          durationMs: result.durationMs,
        })
      }

      await updatePurchaseStatus(txSignature, 'completed', result.audioBase64)

      return NextResponse.json(
        {
          success: true,
          audioBase64: result.audioBase64,
          durationMs: result.durationMs,
          purchaseId: purchase.id,
        },
        { status: 200 }
      )
    } catch (postSaveError) {
      // Reconcile stuck 'pending' state — voice generation failed mid-flight
      try {
        await updatePurchaseStatus(
          txSignature,
          'rejected',
          undefined,
          'voice_generation_failed'
        )
      } catch (reconcileErr) {
        console.error('[VoiceGenerate] Failed to reconcile pending purchase:', reconcileErr)
      }
      throw postSaveError
    }
  } catch (error) {
    const { error: message, code, statusCode, refundNeeded } = getErrorResponse(error)
    return NextResponse.json({ success: false, error: message, code, refundNeeded }, { status: statusCode })
  }
}
