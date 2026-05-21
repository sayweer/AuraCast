import { NextResponse } from 'next/server'

/**
 * GET /api/platform-config
 *
 * Returns public platform configuration needed by client-side code,
 * specifically the platform wallet address for fee transfers.
 */
export async function GET(): Promise<NextResponse> {
  const platformWallet = process.env.PLATFORM_WALLET ?? ''

  if (!platformWallet) {
    return NextResponse.json(
      { error: 'Platform wallet not configured' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    platformWallet,
    feePercent: 10,
  })
}
