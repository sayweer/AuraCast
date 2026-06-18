import { NextRequest, NextResponse } from 'next/server'
import { getCreatorByWallet, saveCreator } from '@/lib/supabase'
import { privateObjectExists } from '@/lib/r2'
import { consumeSession } from '@/lib/session'
import { getErrorResponse } from '@/lib/errors'
import { safeParseJson, isValidWalletAddress, isValidPrice, getClientIp } from '@/lib/validation'
import { checkRateLimit } from '@/lib/rate-limit'
import type { RegisterCreatorRequest } from '@/types'

// Chatterbox/Fal onboarding: no ElevenLabs cloning. The creator's reference WAV and
// consent verification WAV are uploaded directly to R2 (private) via presigned PUT;
// here we consume the one-time upload sessions, confirm the objects exist (HEAD),
// and persist voice_profile_object_key + consent.
const UPLOAD_SESSION_PREFIX = 'upload-session'

interface UploadSession {
  objectKey: string
  walletAddress: string
  type: 'voice-profile' | 'verification-audio'
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(req)
  if (!(await checkRateLimit(ip, 10, 60 * 60 * 1000))) {
    return NextResponse.json(
      { success: false, error: 'Too many registration attempts. Please try again later.' },
      { status: 429 }
    )
  }

  const body = await safeParseJson<Partial<RegisterCreatorRequest>>(req)
  if (body === null) {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    walletAddress,
    creatorName,
    priceInLamports,
    language,
    uploadSessionId,
    verificationUploadSessionId,
    consentTextVersion,
  } = body

  if (
    !walletAddress ||
    !creatorName ||
    priceInLamports === undefined ||
    !uploadSessionId ||
    !verificationUploadSessionId ||
    !consentTextVersion
  ) {
    return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
  }
  if (!isValidWalletAddress(walletAddress)) {
    return NextResponse.json({ success: false, error: 'Invalid wallet address' }, { status: 400 })
  }
  if (typeof creatorName !== 'string' || creatorName.trim().length < 1 || creatorName.trim().length > 100) {
    return NextResponse.json({ success: false, error: 'Creator name must be 1-100 characters' }, { status: 400 })
  }
  if (!isValidPrice(priceInLamports)) {
    return NextResponse.json({ success: false, error: 'Price must be between 0.01 and 0.1 SOL' }, { status: 400 })
  }
  const lang = language === 'tr' ? 'tr' : 'en'

  try {
    const existing = await getCreatorByWallet(walletAddress)
    if (existing !== null && existing.is_active && existing.voice_profile_object_key) {
      return NextResponse.json({ success: false, error: 'Creator already registered' }, { status: 409 })
    }

    // Consume both one-time upload sessions; validate they belong to this wallet,
    // are the right type, and that the uploaded object actually exists in R2.
    const voiceSession = await consumeSession<UploadSession>(UPLOAD_SESSION_PREFIX, uploadSessionId)
    const verifySession = await consumeSession<UploadSession>(UPLOAD_SESSION_PREFIX, verificationUploadSessionId)

    if (
      !voiceSession ||
      voiceSession.walletAddress !== walletAddress ||
      voiceSession.type !== 'voice-profile' ||
      !verifySession ||
      verifySession.walletAddress !== walletAddress ||
      verifySession.type !== 'verification-audio'
    ) {
      return NextResponse.json(
        { success: false, error: 'Upload session invalid or expired', code: 'UPLOAD_SESSION_INVALID' },
        { status: 409 }
      )
    }

    const [voiceExists, verifyExists] = await Promise.all([
      privateObjectExists(voiceSession.objectKey),
      privateObjectExists(verifySession.objectKey),
    ])
    if (!voiceExists || !verifyExists) {
      return NextResponse.json(
        { success: false, error: 'Uploaded audio not found', code: 'UPLOAD_MISSING' },
        { status: 409 }
      )
    }

    const creator = await saveCreator({
      walletAddress,
      creatorName,
      priceInLamports,
      language: lang,
      voiceProfileObjectKey: voiceSession.objectKey,
      consentAt: new Date().toISOString(),
      consentIp: ip,
      consentTextVersion,
      verificationAudioObjectKey: verifySession.objectKey,
    })

    return NextResponse.json({ success: true, creatorId: creator.id }, { status: 201 })
  } catch (error) {
    const { error: message, code, statusCode } = getErrorResponse(error)
    return NextResponse.json({ success: false, error: message, code }, { status: statusCode })
  }
}
