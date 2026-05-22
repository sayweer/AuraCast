import { NextRequest, NextResponse } from 'next/server'
import { getCreatorByWallet, updateCreatorFilters } from '@/lib/supabase'
import { getErrorResponse } from '@/lib/errors'
import { safeParseJson, isValidWalletAddress } from '@/lib/validation'
import { verifyWalletAuthOrSession } from '@/lib/auth'

interface UpdateFiltersBody {
  walletAddress?: string
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

  const { walletAddress, blockAdult, blockProfanity, blockPolitical } = body

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
