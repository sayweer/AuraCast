import { NextRequest, NextResponse } from 'next/server'
import { getCreatorByWallet, updateCreatorVoiceStatus } from '@/lib/supabase'
import { verifyPvcCaptcha, trainPvcVoice } from '@/lib/elevenlabs'
import { getErrorResponse } from '@/lib/errors'
import { isValidWalletAddress, safeParseJson } from '@/lib/validation'
import { verifyWalletAuthOrSession } from '@/lib/auth'
import type { VerifyPvcRequest, VerifyPvcResponse } from '@/types'

export async function POST(req: NextRequest): Promise<NextResponse<VerifyPvcResponse>> {
  const body = await safeParseJson<Partial<VerifyPvcRequest>>(req)
  if (body === null) {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const { walletAddress, recordingBase64 } = body

  if (!walletAddress || !recordingBase64) {
    return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
  }
  if (!isValidWalletAddress(walletAddress)) {
    return NextResponse.json({ success: false, error: 'Invalid wallet address' }, { status: 400 })
  }
  if (typeof recordingBase64 !== 'string' || recordingBase64.length === 0) {
    return NextResponse.json({ success: false, error: 'Recording is required' }, { status: 400 })
  }

  const authorized = await verifyWalletAuthOrSession(walletAddress, req.headers)
  if (!authorized) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const creator = await getCreatorByWallet(walletAddress)
    if (creator === null || !creator.voice_id) {
      return NextResponse.json({ success: false, error: 'Creator not found' }, { status: 404 })
    }
    if (creator.clone_type !== 'pvc') {
      return NextResponse.json({ success: false, error: 'Not a PVC voice' }, { status: 400 })
    }

    const recording = Buffer.from(recordingBase64, 'base64')
    await verifyPvcCaptcha(creator.voice_id, recording)
    await trainPvcVoice(creator.voice_id)
    await updateCreatorVoiceStatus(walletAddress, 'training')

    return NextResponse.json({ success: true, voiceStatus: 'training' }, { status: 200 })
  } catch (error) {
    const { error: message, code, statusCode } = getErrorResponse(error)
    return NextResponse.json({ success: false, error: message, code }, { status: statusCode })
  }
}
