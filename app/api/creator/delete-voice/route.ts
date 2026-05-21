import { NextRequest, NextResponse } from 'next/server'
import { getCreatorByWallet, deleteCreatorVoice } from '@/lib/supabase'
import { deleteVoice } from '@/lib/elevenlabs'
import { getErrorResponse } from '@/lib/errors'
import { safeParseJson, isValidWalletAddress } from '@/lib/validation'
import { verifyWalletAuth } from '@/lib/auth'

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

  // Wallet signature verification (single-use nonce)
  const signature = req.headers.get('x-wallet-signature')
  const nonce = req.headers.get('x-wallet-nonce')
  const authorized = await verifyWalletAuth(walletAddress, signature, nonce)
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
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
