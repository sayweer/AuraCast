import { NextRequest, NextResponse } from 'next/server'
import { getCreatorByWallet, deleteCreatorVoice } from '@/lib/supabase'
import { deleteVoice } from '@/lib/elevenlabs'
import { getErrorResponse } from '@/lib/errors'
import { safeParseJson, isValidWalletAddress } from '@/lib/validation'

interface DeleteVoiceBody {
  walletAddress?: string
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  // Safe JSON parsing
  const body = await safeParseJson<DeleteVoiceBody>(req)
  if (body === null) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { walletAddress } = body

  if (!walletAddress) {
    return NextResponse.json({ error: 'Missing walletAddress' }, { status: 400 })
  }

  if (!isValidWalletAddress(walletAddress)) {
    return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
  }

  try {
    // Basic ownership check: verify creator exists
    // TODO: Implement wallet signature verification for proper auth.
    // This is CRITICAL — without it, anyone can delete any creator's voice.
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
