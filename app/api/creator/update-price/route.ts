import { NextRequest, NextResponse } from 'next/server'
import { updateCreatorPrice } from '@/lib/supabase'
import { getErrorResponse } from '@/lib/errors'

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const { walletAddress, priceInLamports } = await req.json()

    if (!walletAddress || !priceInLamports) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (priceInLamports < 10_000_000 || priceInLamports > 100_000_000) {
      return NextResponse.json(
        { error: 'Price must be between 0.01 and 0.1 SOL per 150 characters' },
        { status: 400 }
      )
    }

    await updateCreatorPrice(walletAddress, priceInLamports)

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    const { error: msg, statusCode } = getErrorResponse(error)
    return NextResponse.json({ error: msg }, { status: statusCode })
  }
}
