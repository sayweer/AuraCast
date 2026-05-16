import { NextRequest, NextResponse } from 'next/server'
import { getCreatorByWallet, savePurchase, updatePurchaseStatus, getPurchaseByTxSignature } from '@/lib/supabase'
import { verifyTransaction } from '@/lib/solana'
import { validateTextLength, isSafeToGenerate } from '@/lib/moderation'
import { generateSpeech } from '@/lib/elevenlabs'
import { getErrorResponse, UnsafeContentError } from '@/lib/errors'
import type { GenerateVoiceRequest } from '@/types'

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = (await req.json()) as Partial<GenerateVoiceRequest>
  const { creatorWallet, fanText, txSignature, buyerWallet } = body

  if (!creatorWallet || !fanText || !txSignature || !buyerWallet) {
    return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
  }

  try {
    validateTextLength(fanText)

    const existing = await getPurchaseByTxSignature(txSignature)
    if (existing !== null) {
      if (existing.status === 'completed' && existing.audio_url) {
        return NextResponse.json(
          { success: true, audioBase64: existing.audio_url },
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

    await verifyTransaction(txSignature, creatorWallet, creator.price_lamports)

    await savePurchase({
      buyerWallet,
      creatorWallet,
      txSignature,
      fanText,
      amountLamports: creator.price_lamports,
    })

    try {
      await isSafeToGenerate(fanText, {
        blockAdult: creator.block_adult,
        blockProfanity: creator.block_profanity,
        blockPolitical: creator.block_political,
      })
    } catch (moderationError) {
      if (moderationError instanceof UnsafeContentError) {
        await updatePurchaseStatus(txSignature, 'rejected')
        return NextResponse.json(
          { success: false, error: 'Content violates creator brand safety policy', refundNeeded: true },
          { status: 422 }
        )
      }
      throw moderationError
    }

    const result = await generateSpeech({ voiceId: creator.voice_id, text: fanText, language: creator.language })

    await updatePurchaseStatus(txSignature, 'completed', result.audioBase64)

    return NextResponse.json(
      { success: true, audioBase64: result.audioBase64, durationMs: result.durationMs },
      { status: 200 }
    )
  } catch (error) {
    const { error: message, code, statusCode, refundNeeded } = getErrorResponse(error)
    return NextResponse.json({ success: false, error: message, code, refundNeeded }, { status: statusCode })
  }
}
