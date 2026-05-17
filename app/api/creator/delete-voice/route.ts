import { NextRequest, NextResponse } from 'next/server'
import { getCreatorByWallet, deleteCreatorVoice } from '@/lib/supabase'
import { deleteVoice } from '@/lib/elevenlabs'
import { getErrorResponse } from '@/lib/errors'
import { safeParseJson, isValidWalletAddress } from '@/lib/validation'
import { verifyWalletSignature, AUTH_MESSAGE } from '@/lib/auth'

interface DeleteVoiceBody {
  walletAddress?: string
  signature?: string
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  // Safe JSON parsing
  const body = await safeParseJson<DeleteVoiceBody>(req)
  if (body === null) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { walletAddress, signature } = body

  if (!walletAddress) {
    return NextResponse.json({ error: 'Missing walletAddress' }, { status: 400 })
  }

  if (!isValidWalletAddress(walletAddress)) {
    return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
  }

  // Wallet signature verification
  if (!signature) {
    return NextResponse.json({ error: 'Signature required' }, { status: 401 })
  }

  if (!verifyWalletSignature(walletAddress, AUTH_MESSAGE, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
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
