import { NextRequest, NextResponse } from 'next/server'
import { getCreatorByWallet, updateCreatorPrice } from '@/lib/supabase'
import { getErrorResponse } from '@/lib/errors'
import { safeParseJson, isValidWalletAddress, isValidPrice } from '@/lib/validation'

interface UpdatePriceBody {
  walletAddress?: string
  priceInLamports?: number
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  // Safe JSON parsing
  const body = await safeParseJson<UpdatePriceBody>(req)
  if (body === null) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { walletAddress, priceInLamports } = body

  if (!walletAddress || priceInLamports === undefined) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    )
  }

  if (!isValidWalletAddress(walletAddress)) {
    return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
  }

  if (!isValidPrice(priceInLamports)) {
    return NextResponse.json(
      { error: 'Price must be between 0.01 and 0.1 SOL per 150 characters' },
      { status: 400 }
    )
  }

  try {
    // Basic ownership check: verify creator exists and is active
    // TODO: Implement wallet signature verification for proper auth.
    const creator = await getCreatorByWallet(walletAddress)
    if (creator === null || !creator.is_active) {
      return NextResponse.json({ error: 'Creator not found or inactive' }, { status: 404 })
    }

    await updateCreatorPrice(walletAddress, priceInLamports)

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    const { error: msg, statusCode } = getErrorResponse(error)
    return NextResponse.json({ error: msg }, { status: statusCode })
  }
}
