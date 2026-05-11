import { NextRequest, NextResponse } from 'next/server'
import { updateCreatorFilters } from '@/lib/supabase'
import { getErrorResponse } from '@/lib/errors'

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const { walletAddress, blockAdult, blockProfanity, blockPolitical } = await req.json()

    if (!walletAddress) {
      return NextResponse.json({ error: 'Missing walletAddress' }, { status: 400 })
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
