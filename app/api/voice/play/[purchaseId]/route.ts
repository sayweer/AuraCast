import { NextRequest, NextResponse } from 'next/server'
import { getPurchaseById, incrementPlayCount } from '@/lib/supabase'
import { isValidWalletAddress, getClientIp, safeParseJson } from '@/lib/validation'
import { checkRateLimit } from '@/lib/rate-limit'
import { getErrorResponse } from '@/lib/errors'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(
  req: NextRequest,
  { params }: { params: { purchaseId: string } }
): Promise<NextResponse> {
  const ip = getClientIp(req)
  if (!await checkRateLimit(`play:${ip}`, 60, 60_000)) {
    return NextResponse.json(
      { success: false, error: 'Too many requests', code: 'RATE_LIMITED' },
      { status: 429 }
    )
  }

  const purchaseId = params.purchaseId
  if (!UUID_REGEX.test(purchaseId)) {
    return NextResponse.json(
      { success: false, error: 'Invalid purchase id' },
      { status: 400 }
    )
  }

  const body = await safeParseJson<{ buyerWallet?: string }>(req)
  if (body === null || !body.buyerWallet || !isValidWalletAddress(body.buyerWallet)) {
    return NextResponse.json(
      { success: false, error: 'Invalid buyer wallet' },
      { status: 400 }
    )
  }

  try {
    const purchase = await getPurchaseById(purchaseId)
    if (purchase === null) {
      return NextResponse.json(
        { success: false, error: 'Purchase not found' },
        { status: 404 }
      )
    }

    if (purchase.buyer_wallet !== body.buyerWallet) {
      return NextResponse.json(
        { success: false, error: 'Buyer mismatch' },
        { status: 403 }
      )
    }

    if (purchase.status !== 'completed') {
      return NextResponse.json(
        { success: false, error: 'Purchase not playable' },
        { status: 409 }
      )
    }

    await incrementPlayCount(purchaseId)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    const { error: message, code, statusCode } = getErrorResponse(error)
    return NextResponse.json(
      { success: false, error: message, code },
      { status: statusCode }
    )
  }
}
