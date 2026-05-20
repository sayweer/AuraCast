import { NextRequest, NextResponse } from 'next/server'
import { getCreatorByWallet, savePurchase, updatePurchaseStatus } from '@/lib/supabase'
import { verifyTransaction } from '@/lib/solana'
import { isSafeToGenerate } from '@/lib/moderation'
import { generateSpeech } from '@/lib/elevenlabs'
import { getErrorResponse, UnsafeContentError } from '@/lib/errors'
import { checkRateLimit } from '@/lib/rate-limit'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-action-version, x-blockchain-ids',
}

export async function OPTIONS() {
  return NextResponse.json(null, { status: 200, headers: CORS_HEADERS })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { creatorWallet: string } }
): Promise<NextResponse> {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1'
    if (!await checkRateLimit(`blink-callback:${ip}`, 10, 24 * 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Blink üzerinden günlük ses üretim limitinizi (10) doldurdunuz. Lütfen yarın tekrar deneyin.' },
        { status: 429, headers: CORS_HEADERS }
      )
    }

    const { creatorWallet } = params
    const text = req.nextUrl.searchParams.get('text') ?? ''
    
    const body = await req.json().catch(() => null) as { signature?: string; account?: string } | null
    const signature = body?.signature ?? ''
    const buyerWallet = body?.account ?? ''

    if (!signature || !buyerWallet) {
      return NextResponse.json({ error: 'Signature and account are required' }, { status: 400, headers: CORS_HEADERS })
    }

    if (!text || text.length < 5 || text.length > 300) {
      return NextResponse.json({ error: 'Text must be between 5 and 300 characters' }, { status: 400, headers: CORS_HEADERS })
    }

    const creator = await getCreatorByWallet(creatorWallet)
    if (creator === null) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404, headers: CORS_HEADERS })
    }

    // 1. Verify the transaction was confirmed on-chain
    await verifyTransaction(signature, creatorWallet, creator.price_lamports)

    // 2. Save the purchase record as pending
    const platformFeeLamports = Math.floor(creator.price_lamports * 0.1)
    const purchase = await savePurchase({
      buyerWallet,
      creatorWallet,
      txSignature: signature,
      fanText: text,
      amountLamports: creator.price_lamports,
      platformFeeLamports,
    })

    // 3. Run brand safety moderation
    try {
      await isSafeToGenerate(text, {
        blockAdult: creator.block_adult,
        blockProfanity: creator.block_profanity,
        blockPolitical: creator.block_political,
      })
    } catch (moderationError) {
      if (moderationError instanceof UnsafeContentError) {
        await updatePurchaseStatus(
          signature,
          'rejected',
          undefined,
          `${moderationError.category}: ${moderationError.reason}`
        )
        return NextResponse.json(
          {
            type: 'completed',
            icon: 'https://auracast-murex.vercel.app/rejected.png',
            title: 'Marka Güvenliği Engeli',
            description: `Yazdığınız metin marka güvenliği kurallarını ihlal ettiği için ses üretimi durduruldu. Solana transferiniz iade edilecektir. Gerekçe: ${moderationError.reason}`,
          },
          { status: 200, headers: CORS_HEADERS }
        )
      }
      throw moderationError
    }

    // 4. Generate the voice clip
    const result = await generateSpeech({ voiceId: creator.voice_id, text, language: creator.language })

    // 5. Update purchase status to completed
    await updatePurchaseStatus(signature, 'completed', result.audioBase64)

    // 6. Return completed Blink action response
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://auracast-murex.vercel.app'
    const playUrl = `${baseUrl}/play/${signature}`

    return NextResponse.json({
      type: 'completed',
      icon: 'https://auracast-murex.vercel.app/success.png',
      title: 'Ses Klonu Başarıyla Üretildi! 🎉',
      description: `Mesajınız ElevenLabs ile ${creator.creator_name} sesiyle seslendirildi. Dinlemek için tıklayın: ${playUrl}`,
    }, { status: 200, headers: CORS_HEADERS })

  } catch (error) {
    const { error: message, statusCode } = getErrorResponse(error)
    return NextResponse.json({ error: message }, { status: statusCode, headers: CORS_HEADERS })
  }
}
