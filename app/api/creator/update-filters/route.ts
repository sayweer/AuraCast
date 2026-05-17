import { NextRequest, NextResponse } from 'next/server'
import { getCreatorByWallet, updateCreatorFilters } from '@/lib/supabase'
import { getErrorResponse } from '@/lib/errors'
import { safeParseJson, isValidWalletAddress } from '@/lib/validation'
import { verifyWalletSignature, AUTH_MESSAGE } from '@/lib/auth'

interface UpdateFiltersBody {
  walletAddress?: string
  signature?: string
  blockAdult?: boolean
  blockProfanity?: boolean
  blockPolitical?: boolean
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  // Safe JSON parsing
  const body = await safeParseJson<UpdateFiltersBody>(req)
  if (body === null) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { walletAddress, signature, blockAdult, blockProfanity, blockPolitical } = body

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
    if (creator === null || !creator.is_active) {
      return NextResponse.json({ error: 'Creator not found or inactive' }, { status: 404 })
    }

    await updateCreatorFilters(walletAddress, {
      blockAdult: blockAdult ?? true,
      blockProfanity: blockProfanity ?? true,
      blockPolitical: blockPolitical ?? true,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const { error: msg, statusCode } = getErrorResponse(error)
    return NextResponse.json({ error: msg }, { status: statusCode })
  }
}
