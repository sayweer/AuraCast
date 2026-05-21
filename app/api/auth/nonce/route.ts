import { NextRequest, NextResponse } from 'next/server'
import { issueAuthNonce, buildAuthMessage } from '@/lib/auth'
import { safeParseJson, isValidWalletAddress, getClientIp } from '@/lib/validation'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Rate limit: 20 nonces per IP per minute (signature flow runs once per action)
  const ip = getClientIp(req)
  if (!(await checkRateLimit(`nonce:${ip}`, 20, 60_000))) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    )
  }

  const body = await safeParseJson<{ walletAddress?: string }>(req)
  const walletAddress = body?.walletAddress

  if (!walletAddress || !isValidWalletAddress(walletAddress)) {
    return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
  }

  const nonce = await issueAuthNonce(walletAddress)
  if (!nonce) {
    return NextResponse.json(
      { error: 'Authentication service unavailable. Please try again.' },
      { status: 503 }
    )
  }

  const message = buildAuthMessage(walletAddress, nonce)

  return NextResponse.json(
    { nonce, message },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  )
}
