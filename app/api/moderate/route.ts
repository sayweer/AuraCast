import { NextRequest, NextResponse } from 'next/server'
import { getCreatorByWallet } from '@/lib/supabase'
import {
    isSafeToGenerate,
    validateTextLengthForLanguage,
    hashUserText,
    maxTextLengthFor,
} from '@/lib/moderation'
import { createSession } from '@/lib/session'
import { getErrorResponse, UnsafeContentError } from '@/lib/errors'
import { safeParseJson, isValidWalletAddress, getClientIp } from '@/lib/validation'
import { checkRateLimit } from '@/lib/rate-limit'

export const maxDuration = 15

// Pre-payment moderation. Fan submits text BEFORE paying; if unsafe, no payment is taken.
// On success a one-time moderation session is stored (raw text hash) that /api/voice/generate
// must present — locking the approved text to the generated text across the payment boundary.
const MOD_SESSION_PREFIX = 'mod-session'
const MOD_SESSION_TTL = 10 * 60 // 10 dk — ödeme için yeterli pencere

interface ModerateRequest {
    creatorWallet: string
    buyerWallet: string
    text: string
}

export async function POST(req: NextRequest): Promise<NextResponse> {
    const ip = getClientIp(req)
    if (!(await checkRateLimit(ip, 10, 60_000))) {
        return NextResponse.json(
            { success: false, error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' },
            { status: 429 }
        )
    }

    const body = await safeParseJson<Partial<ModerateRequest>>(req)
    if (body === null) {
        return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
    }

    const { creatorWallet, buyerWallet, text } = body
    if (!creatorWallet || !buyerWallet || typeof text !== 'string') {
        return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }
    if (!isValidWalletAddress(creatorWallet) || !isValidWalletAddress(buyerWallet)) {
        return NextResponse.json({ success: false, error: 'Invalid wallet address' }, { status: 400 })
    }

    try {
        const creator = await getCreatorByWallet(creatorWallet)
        if (creator === null) {
            return NextResponse.json({ success: false, error: 'Creator not found' }, { status: 404 })
        }
        if (!creator.is_active) {
            return NextResponse.json({ success: false, error: 'Creator is not active' }, { status: 403 })
        }

        const language = creator.language
        validateTextLengthForLanguage(text, language)

        try {
            await isSafeToGenerate(text, {
                blockAdult: creator.block_adult,
                blockProfanity: creator.block_profanity,
                blockPolitical: creator.block_political,
            })
        } catch (moderationError) {
            if (moderationError instanceof UnsafeContentError) {
                return NextResponse.json(
                    {
                        success: false,
                        approved: false,
                        error: 'Content violates creator brand safety policy',
                        category: moderationError.category,
                        code: 'UNSAFE_CONTENT',
                    },
                    { status: 422 }
                )
            }
            throw moderationError
        }

        // Approved → bind the raw text + buyer + creator to a one-time session.
        const moderationSessionId = await createSession(
            MOD_SESSION_PREFIX,
            { buyerWallet, creatorWallet, rawTextHash: hashUserText(text), language },
            MOD_SESSION_TTL
        )

        return NextResponse.json({
            success: true,
            approved: true,
            moderationSessionId,
            language,
            maxLength: maxTextLengthFor(language),
        })
    } catch (error) {
        const { error: message, code, statusCode } = getErrorResponse(error)
        return NextResponse.json({ success: false, error: message, code }, { status: statusCode })
    }
}
