import { NextRequest, NextResponse } from 'next/server'
import { getCreatorByWallet, updateCreatorVoiceStatus } from '@/lib/supabase'
import { getPvcFineTuneState } from '@/lib/elevenlabs'
import { getErrorResponse } from '@/lib/errors'
import { isValidWalletAddress } from '@/lib/validation'
import type { PvcStatusResponse } from '@/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Lazy status sync: the dashboard polls this while a PVC voice is training. Only voices
// that are actually mid-training trigger a live call to ElevenLabs; once ready/failed we
// short-circuit from the DB. No cron or webhook needed.
export async function GET(
  req: NextRequest,
  { params }: { params: { walletAddress: string } }
): Promise<NextResponse> {
  const { walletAddress } = params

  if (!isValidWalletAddress(walletAddress)) {
    return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
  }

  try {
    const creator = await getCreatorByWallet(walletAddress)
    if (creator === null) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
    }

    if (creator.clone_type !== 'pvc' || creator.voice_status !== 'training') {
      const resp: PvcStatusResponse = { voice_status: creator.voice_status }
      return NextResponse.json(resp, { status: 200 })
    }

    const { state, progress } = await getPvcFineTuneState(creator.voice_id)

    if (state === 'fine_tuned') {
      await updateCreatorVoiceStatus(walletAddress, 'ready', { isActive: true })
      const resp: PvcStatusResponse = { voice_status: 'ready', progress: 1 }
      return NextResponse.json(resp, { status: 200 })
    }
    if (state === 'failed') {
      await updateCreatorVoiceStatus(walletAddress, 'failed')
      const resp: PvcStatusResponse = { voice_status: 'failed' }
      return NextResponse.json(resp, { status: 200 })
    }

    // Still in progress: queued / fine_tuning / delayed / not_started.
    const resp: PvcStatusResponse = { voice_status: 'training', progress }
    return NextResponse.json(resp, { status: 200 })
  } catch (error) {
    const { error: message, code, statusCode } = getErrorResponse(error)
    return NextResponse.json({ error: message, code }, { status: statusCode })
  }
}
