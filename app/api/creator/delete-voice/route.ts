import { NextRequest, NextResponse } from 'next/server'
import { getCreatorByWallet, deleteCreatorVoice } from '@/lib/supabase'
import { getErrorResponse } from '@/lib/errors'
import { safeParseJson, isValidWalletAddress } from '@/lib/validation'
import { verifyWalletAuthOrSession } from '@/lib/auth'

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

  // Wallet signature verification (single-use nonce/session token)
  const authorized = await verifyWalletAuthOrSession(walletAddress, req.headers)
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const creator = await getCreatorByWallet(walletAddress)
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
    }

    await deleteCreatorVoice(walletAddress)

    return NextResponse.json({ success: true })
  } catch (error) {
    const { error: msg, statusCode } = getErrorResponse(error)
    return NextResponse.json({ error: msg }, { status: statusCode })
  }
}
