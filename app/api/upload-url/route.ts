import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getPresignedPutUrl } from '@/lib/r2'
import { createSession } from '@/lib/session'
import { getErrorResponse } from '@/lib/errors'
import { safeParseJson, isValidWalletAddress, getClientIp } from '@/lib/validation'
import { checkRateLimit } from '@/lib/rate-limit'

export const maxDuration = 15

// Issues a presigned PUT URL for direct browser → private-bucket upload.
// The objectKey is SERVER-generated (never trusted from the client) and bound to a
// one-time upload session; /api/creator/register consumes the session and validates
// the wallet + R2 HEAD before persisting voice_profile_object_key.
const UPLOAD_SESSION_PREFIX = 'upload-session'
const UPLOAD_SESSION_TTL = 10 * 60
const UPLOAD_CONTENT_TYPE = 'audio/wav' // client converts WebM → 24kHz mono WAV before upload

const KEY_PREFIX: Record<UploadType, string> = {
    'voice-profile': 'voice-profiles',
    'verification-audio': 'verification-audio',
}
type UploadType = 'voice-profile' | 'verification-audio'

interface UploadUrlRequest {
    walletAddress: string
    type: UploadType
}

export async function POST(req: NextRequest): Promise<NextResponse> {
    const ip = getClientIp(req)
    if (!(await checkRateLimit(ip, 10, 60_000))) {
        return NextResponse.json(
            { success: false, error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' },
            { status: 429 }
        )
    }

    const body = await safeParseJson<Partial<UploadUrlRequest>>(req)
    if (body === null) {
        return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
    }

    const { walletAddress, type } = body
    if (!walletAddress || !isValidWalletAddress(walletAddress)) {
        return NextResponse.json({ success: false, error: 'Invalid wallet address' }, { status: 400 })
    }
    if (type !== 'voice-profile' && type !== 'verification-audio') {
        return NextResponse.json({ success: false, error: 'Invalid upload type' }, { status: 400 })
    }

    try {
        const objectKey = `${KEY_PREFIX[type]}/${walletAddress}/${randomUUID()}.wav`
        const uploadSessionId = await createSession(
            UPLOAD_SESSION_PREFIX,
            { objectKey, walletAddress, type },
            UPLOAD_SESSION_TTL
        )
        const uploadUrl = await getPresignedPutUrl(objectKey, UPLOAD_CONTENT_TYPE)

        return NextResponse.json({
            success: true,
            uploadSessionId,
            uploadUrl,
            contentType: UPLOAD_CONTENT_TYPE,
        })
    } catch (error) {
        const { error: message, code, statusCode } = getErrorResponse(error)
        return NextResponse.json({ success: false, error: message, code }, { status: statusCode })
    }
}
