import { NextRequest, NextResponse } from 'next/server'
import { getCreatorByWallet, deleteCreatorVoice } from '@/lib/supabase'
import { deleteVoice } from '@/lib/elevenlabs'
import { getErrorResponse } from '@/lib/errors'

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    const { walletAddress } = await req.json()

    if (!walletAddress) {
      return NextResponse.json({ error: 'Missing walletAddress' }, { status: 400 })
    }

    const creator = await getCreatorByWallet(walletAddress)
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
    }

    if (creator.voice_id && creator.voice_id !== 'test_voice_id') {
      await deleteVoice(creator.voice_id)
    }

    await deleteCreatorVoice(walletAddress)

    return NextResponse.json({ success: true })
  } catch (error) {
    const { error: msg, statusCode } = getErrorResponse(error)
    return NextResponse.json({ error: msg }, { status: statusCode })
  }
}
