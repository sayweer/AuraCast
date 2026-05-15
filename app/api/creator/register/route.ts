import { NextRequest, NextResponse } from 'next/server'
import { getCreatorByWallet, saveCreator } from '@/lib/supabase'
import { cloneVoice } from '@/lib/elevenlabs'
import { getErrorResponse } from '@/lib/errors'
import type { RegisterCreatorRequest, RegisterCreatorResponse } from '@/types'

export async function POST(req: NextRequest): Promise<NextResponse<RegisterCreatorResponse>> {
  const body = (await req.json()) as Partial<RegisterCreatorRequest>
  const { walletAddress, creatorName, audioBase64, fileName, priceInLamports, language } = body

  if (!walletAddress || !creatorName || !audioBase64 || !fileName || priceInLamports === undefined) {
    return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const existing = await getCreatorByWallet(walletAddress)
    if (existing !== null && existing.is_active && existing.voice_id) {
      return NextResponse.json({ success: false, error: 'Creator already registered' }, { status: 409 })
    }

    const audioBuffer = Buffer.from(audioBase64, 'base64')
    const voiceId = await cloneVoice(audioBuffer, fileName, creatorName)
    const creator = await saveCreator({ walletAddress, creatorName, audioBase64, fileName, voiceId, priceInLamports, language: language ?? 'en' })

    return NextResponse.json({ success: true, voiceId, creatorId: creator.id }, { status: 201 })
  } catch (error) {
    const { error: message, code, statusCode } = getErrorResponse(error)
    return NextResponse.json({ success: false, error: message, code }, { status: statusCode })
  }
}
