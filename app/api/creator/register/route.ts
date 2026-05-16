import { NextRequest, NextResponse } from 'next/server'
import { getCreatorByWallet, saveCreator } from '@/lib/supabase'
import { cloneVoice } from '@/lib/elevenlabs'
import { getErrorResponse } from '@/lib/errors'
import { safeParseJson, isValidWalletAddress, isValidPrice, getClientIp } from '@/lib/validation'
import { checkRateLimit } from '@/lib/rate-limit'
import type { RegisterCreatorRequest, RegisterCreatorResponse } from '@/types'

export async function POST(req: NextRequest): Promise<NextResponse<RegisterCreatorResponse>> {
  // Rate limit: max 3 requests per IP per hour
  const ip = getClientIp(req)
  if (!checkRateLimit(ip, 3, 60 * 60 * 1000)) {
    return NextResponse.json(
      { success: false, error: 'Too many registration attempts. Please try again later.' },
      { status: 429 }
    )
  }

  // Safe JSON parsing
  const body = await safeParseJson<Partial<RegisterCreatorRequest>>(req)
  if (body === null) {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const { walletAddress, creatorName, audioBase64, fileName, priceInLamports, language } = body

  // Field presence checks
  if (!walletAddress || !creatorName || !audioBase64 || !fileName || priceInLamports === undefined) {
    return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
  }

  // Input format validation
  if (!isValidWalletAddress(walletAddress)) {
    return NextResponse.json({ success: false, error: 'Invalid wallet address' }, { status: 400 })
  }
  if (typeof creatorName !== 'string' || creatorName.trim().length < 1 || creatorName.trim().length > 100) {
    return NextResponse.json({ success: false, error: 'Creator name must be 1-100 characters' }, { status: 400 })
  }
  if (!isValidPrice(priceInLamports)) {
    return NextResponse.json(
      { success: false, error: 'Price must be between 0.01 and 0.1 SOL' },
      { status: 400 }
    )
  }
  if (typeof audioBase64 !== 'string' || audioBase64.length === 0) {
    return NextResponse.json({ success: false, error: 'Audio data is required' }, { status: 400 })
  }
  if (language !== undefined && typeof language !== 'string') {
    return NextResponse.json({ success: false, error: 'Invalid language parameter' }, { status: 400 })
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
