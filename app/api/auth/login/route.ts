import { NextRequest, NextResponse } from 'next/server'
import { verifyWalletAuth, generateSessionToken } from '@/lib/auth'
import { safeParseJson, isValidWalletAddress, getClientIp } from '@/lib/validation'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Rate limit: 10 login requests per IP per minute
  const ip = getClientIp(req)
  if (!(await checkRateLimit(`login:${ip}`, 10, 60_000))) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      { status: 429 }
    )
  }

  const body = await safeParseJson<{
    walletAddress?: string
    signature?: string
    nonce?: string
  }>(req)

  const walletAddress = body?.walletAddress
  const signature = body?.signature
  const nonce = body?.nonce

  if (!walletAddress || !signature || !nonce) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (!isValidWalletAddress(walletAddress)) {
    return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
  }

  const authorized = await verifyWalletAuth(walletAddress, signature, nonce)
  if (!authorized) {
    return NextResponse.json({ error: 'Invalid signature or expired session' }, { status: 401 })
  }

  const token = generateSessionToken(walletAddress)

  return NextResponse.json(
    { success: true, token },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  )
}
