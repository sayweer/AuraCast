import { NextRequest, NextResponse } from 'next/server'
import { getCreatorByWallet, saveCreator } from '@/lib/supabase'
import { createPvcVoice, addPvcSamples, getPvcCaptcha, deleteVoice } from '@/lib/elevenlabs'
import { getErrorResponse } from '@/lib/errors'
import { isValidWalletAddress, isValidPrice, getClientIp } from '@/lib/validation'
import { checkRateLimit } from '@/lib/rate-limit'
import type { RegisterPvcResponse } from '@/types'

// PVC samples are large (30min+ of audio). Allow a longer execution window.
export const maxDuration = 60

// Sanity floor — ElevenLabs enforces the real 30-minute minimum server-side.
const MIN_PVC_BYTES = 1 * 1024 * 1024
// Covers roughly 30-60 min of compressed audio. Multi-hour uploads exceed serverless
// body limits and will need chunked/direct-to-storage upload in a future iteration.
const MAX_PVC_BYTES = 90 * 1024 * 1024

export async function POST(req: NextRequest): Promise<NextResponse<RegisterPvcResponse>> {
  const ip = getClientIp(req)
  if (!await checkRateLimit(ip, 10, 60 * 60 * 1000)) {
    return NextResponse.json(
      { success: false, error: 'Too many registration attempts. Please try again later.' },
      { status: 429 }
    )
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid multipart form data' }, { status: 400 })
  }

  const walletAddress = String(form.get('walletAddress') ?? '')
  const creatorName = String(form.get('creatorName') ?? '')
  const language = String(form.get('language') ?? 'en')
  const priceInLamports = Number(form.get('priceInLamports'))
  const files = form.getAll('files').filter((f): f is File => f instanceof File)

  if (!walletAddress || !creatorName || !Number.isFinite(priceInLamports) || files.length === 0) {
    return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
  }
  if (!isValidWalletAddress(walletAddress)) {
    return NextResponse.json({ success: false, error: 'Invalid wallet address' }, { status: 400 })
  }
  if (creatorName.trim().length < 1 || creatorName.trim().length > 100) {
    return NextResponse.json({ success: false, error: 'Creator name must be 1-100 characters' }, { status: 400 })
  }
  if (!isValidPrice(priceInLamports)) {
    return NextResponse.json(
      { success: false, error: 'Price must be between 0.01 and 0.1 SOL' },
      { status: 400 }
    )
  }

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0)
  if (totalBytes < MIN_PVC_BYTES) {
    return NextResponse.json({ success: false, error: 'En az 30 dakikalık ses örneği yükleyin.' }, { status: 400 })
  }
  if (totalBytes > MAX_PVC_BYTES) {
    return NextResponse.json(
      { success: false, error: 'Toplam ses boyutu çok büyük (maks ~90MB). Daha kısa veya sıkıştırılmış dosyalar yükleyin.' },
      { status: 400 }
    )
  }

  try {
    const existing = await getCreatorByWallet(walletAddress)
    if (existing !== null && existing.is_active && existing.voice_id && existing.voice_status === 'ready') {
      return NextResponse.json({ success: false, error: 'Creator already registered' }, { status: 409 })
    }

    const voiceId = await createPvcVoice(creatorName, language)

    try {
      const sampleFiles = await Promise.all(
        files.map(async (f) => ({
          buffer: Buffer.from(await f.arrayBuffer()),
          fileName: f.name || 'sample.mp3',
        }))
      )
      await addPvcSamples(voiceId, sampleFiles)
      const captchaImage = await getPvcCaptcha(voiceId)

      // Persist the creator in a pre-training state. is_active stays false (and so the
      // fan page treats them as unavailable) until fine-tuning completes.
      await saveCreator({
        walletAddress,
        creatorName,
        voiceId,
        priceInLamports,
        language,
        cloneType: 'pvc',
        voiceStatus: 'pending_verification',
        isActive: false,
      })

      return NextResponse.json({ success: true, voiceId, captchaImage }, { status: 201 })
    } catch (innerErr) {
      // Roll back the orphaned PVC voice so a half-created clone doesn't occupy a slot.
      await deleteVoice(voiceId).catch((cleanupErr) => {
        console.error('[RegisterPvc] Orphan voice cleanup failed:', cleanupErr, { voiceId })
      })
      throw innerErr
    }
  } catch (error) {
    const { error: message, code, statusCode } = getErrorResponse(error)
    return NextResponse.json({ success: false, error: message, code }, { status: statusCode })
  }
}
