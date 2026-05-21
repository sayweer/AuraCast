import { NextRequest, NextResponse } from 'next/server'
import { getCreatorAnalytics } from '@/lib/supabase'
import { verifyWalletAuth } from '@/lib/auth'
import { isValidWalletAddress, getClientIp } from '@/lib/validation'
import { checkRateLimit } from '@/lib/rate-limit'
import { getErrorResponse } from '@/lib/errors'
import type { AnalyticsRangeDays } from '@/types'

const ALLOWED_DAYS = new Set<number>([7, 30, 90])

function parseDays(raw: string | null): AnalyticsRangeDays {
  const n = Number(raw)
  if (ALLOWED_DAYS.has(n)) return n as AnalyticsRangeDays
  return 30
}

export async function GET(
  req: NextRequest,
  { params }: { params: { walletAddress: string } }
): Promise<NextResponse> {
  const ip = getClientIp(req)
  if (!await checkRateLimit(`analytics:${ip}`, 30, 60_000)) {
    return NextResponse.json(
      { success: false, error: 'Too many requests', code: 'RATE_LIMITED' },
      { status: 429 }
    )
  }

  const walletAddress = params.walletAddress
  if (!isValidWalletAddress(walletAddress)) {
    return NextResponse.json(
      { success: false, error: 'Invalid wallet address' },
      { status: 400 }
    )
  }

  const signature = req.headers.get('x-wallet-signature')
  const nonce = req.headers.get('x-wallet-nonce')
  const authorized = await verifyWalletAuth(walletAddress, signature, nonce)
  if (!authorized) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const days = parseDays(req.nextUrl.searchParams.get('days'))

  try {
    const data = await getCreatorAnalytics(walletAddress, days)
    return NextResponse.json(data, {
      status: 200,
      headers: { 'Cache-Control': 'private, max-age=30' },
    })
  } catch (error) {
    const { error: message, code, statusCode } = getErrorResponse(error)
    return NextResponse.json(
      { success: false, error: message, code },
      { status: statusCode }
    )
  }
}
