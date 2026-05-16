import { NextRequest, NextResponse } from 'next/server'
import { getCreatorByWallet } from '@/lib/supabase'
import { getErrorResponse } from '@/lib/errors'
import { isValidWalletAddress } from '@/lib/validation'

/** Public-safe fields that can be returned to fans */
interface PublicCreatorInfo {
  creator_name: string
  price_lamports: number
  is_active: boolean
  language: string
  voice_id: string
}

export async function GET(
  req: NextRequest,
  { params }: { params: { walletAddress: string } }
): Promise<NextResponse> {
  const { walletAddress } = params

  if (!isValidWalletAddress(walletAddress)) {
    return NextResponse.json(
      { error: 'Invalid wallet address', code: 'INVALID_WALLET' },
      { status: 400 }
    )
  }

  try {
    const creator = await getCreatorByWallet(walletAddress)
    if (creator === null) {
      return NextResponse.json(
        { error: 'Creator not found', code: 'CREATOR_NOT_FOUND' },
        { status: 404 }
      )
    }

    // If ?public=true, return only fan-safe fields (no filter settings, earnings, etc.)
    const isPublic = req.nextUrl.searchParams.get('public') === 'true'

    if (isPublic) {
      const publicInfo: PublicCreatorInfo = {
        creator_name: creator.creator_name,
        price_lamports: creator.price_lamports,
        is_active: creator.is_active,
        language: creator.language,
        voice_id: creator.voice_id,
      }
      return NextResponse.json(publicInfo, { status: 200 })
    }

    // Full response for creator dashboard
    // TODO: Add wallet signature verification to protect this path.
    // Currently any caller can fetch the full creator record.
    return NextResponse.json(creator, { status: 200 })
  } catch (error) {
    const { error: message, code, statusCode } = getErrorResponse(error)
    return NextResponse.json({ error: message, code }, { status: statusCode })
  }
}
