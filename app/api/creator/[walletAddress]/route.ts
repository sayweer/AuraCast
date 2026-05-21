import { NextRequest, NextResponse } from 'next/server'
import { getCreatorByWallet } from '@/lib/supabase'
import { getErrorResponse } from '@/lib/errors'
import { isValidWalletAddress } from '@/lib/validation'
import { verifyWalletAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
} as const

function jsonNoStore<T>(body: T, status: number): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS })
}

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
    return jsonNoStore({ error: 'Invalid wallet address', code: 'INVALID_WALLET' }, 400)
  }

  try {
    const creator = await getCreatorByWallet(walletAddress)
    if (creator === null) {
      return jsonNoStore({ error: 'Creator not found', code: 'CREATOR_NOT_FOUND' }, 404)
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
      return jsonNoStore(publicInfo, 200)
    }

    // Full response for creator dashboard — requires wallet signature
    const signature = req.headers.get('x-wallet-signature')
    const nonce = req.headers.get('x-wallet-nonce')
    const authorized = await verifyWalletAuth(walletAddress, signature, nonce)
    if (!authorized) {
      return jsonNoStore({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401)
    }

    return jsonNoStore(creator, 200)
  } catch (error) {
    const { error: message, code, statusCode } = getErrorResponse(error)
    return jsonNoStore({ error: message, code }, statusCode)
  }
}
