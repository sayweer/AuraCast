import { NextRequest, NextResponse } from 'next/server'
import { getPurchaseById, markPurchaseAudioTakenDown } from '@/lib/supabase'
import { deletePublicObject, purgeCdnCache, publicUrlToObjectKey } from '@/lib/r2'
import { verifyWalletAuthOrSession } from '@/lib/auth'
import { getErrorResponse } from '@/lib/errors'
import { safeParseJson, isValidWalletAddress, getClientIp } from '@/lib/validation'
import { checkRateLimit } from '@/lib/rate-limit'

export const maxDuration = 15

// Removes a fan output from public access: deletes the R2 object, purges the CDN edge
// cache (immutable cache makes this mandatory), and flags the purchase row. Authorized
// for the owning creator or the platform admin (PLATFORM_WALLET).
interface TakedownRequest {
    purchaseId: string
    reason: string
    walletAddress: string
}

export async function POST(req: NextRequest): Promise<NextResponse> {
    const ip = getClientIp(req)
    if (!(await checkRateLimit(ip, 10, 60_000))) {
        return NextResponse.json(
            { success: false, error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' },
            { status: 429 }
        )
    }

    const body = await safeParseJson<Partial<TakedownRequest>>(req)
    if (body === null) {
        return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
    }

    const { purchaseId, reason, walletAddress } = body
    if (!purchaseId || !walletAddress || typeof reason !== 'string' || reason.trim().length < 3) {
        return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }
    if (!isValidWalletAddress(walletAddress)) {
        return NextResponse.json({ success: false, error: 'Invalid wallet address' }, { status: 400 })
    }

    try {
        if (!(await verifyWalletAuthOrSession(walletAddress, req.headers))) {
            return NextResponse.json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
        }

        const purchase = await getPurchaseById(purchaseId)
        if (purchase === null) {
            return NextResponse.json({ success: false, error: 'Purchase not found' }, { status: 404 })
        }

        // Authorization: owning creator OR platform admin.
        const isOwner = purchase.creator_wallet === walletAddress
        const isAdmin = !!process.env.PLATFORM_WALLET && walletAddress === process.env.PLATFORM_WALLET
        if (!isOwner && !isAdmin) {
            return NextResponse.json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
        }

        // Remove from storage + edge cache (best-effort purge), then flag the row.
        if (purchase.audio_url) {
            const objectKey = publicUrlToObjectKey(purchase.audio_url)
            if (objectKey) {
                await deletePublicObject(objectKey)
                await purgeCdnCache(purchase.audio_url)
            }
        }
        await markPurchaseAudioTakenDown(purchaseId, reason.trim())

        console.log('[Takedown]', { purchaseId, by: isAdmin ? 'admin' : 'creator' })
        return NextResponse.json({ success: true })
    } catch (error) {
        const { error: message, code, statusCode } = getErrorResponse(error)
        return NextResponse.json({ success: false, error: message, code }, { status: statusCode })
    }
}
