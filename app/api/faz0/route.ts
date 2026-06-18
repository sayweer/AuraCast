// TEMPORARY — Faz 0 vertical slice doğrulama endpoint'i. Migration kanıtlanınca SİLİNECEK.
// Zincir: presigned PUT (private R2) → signed GET → Fal (dual-engine) → R2 public → URL.
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getPresignedPutUrl, getSignedGetUrl, uploadPublicObject } from '@/lib/r2'
import { generateSpeech } from '@/lib/tts'
import { getErrorResponse } from '@/lib/errors'

export const maxDuration = 15

// GET /api/_faz0?contentType=audio/wav → presigned PUT URL + objectKey
export async function GET(req: NextRequest) {
    try {
        const contentType = req.nextUrl.searchParams.get('contentType') ?? 'audio/wav'
        const objectKey = `voice-profiles/_faz0/${randomUUID()}.wav`
        const uploadUrl = await getPresignedPutUrl(objectKey, contentType)
        return NextResponse.json({ objectKey, uploadUrl, contentType })
    } catch (error) {
        const { error: msg, code, statusCode } = getErrorResponse(error)
        return NextResponse.json({ error: msg, code }, { status: statusCode })
    }
}

// POST /api/_faz0 { objectKey, language, text }
export async function POST(req: NextRequest) {
    try {
        const { objectKey, language, text } = await req.json()
        if (!objectKey || !text || (language !== 'tr' && language !== 'en')) {
            return NextResponse.json(
                { error: 'objectKey, text, language(tr|en) required' },
                { status: 400 }
            )
        }

        // 1. Private referans WAV → kısa ömürlü signed GET URL
        const referenceAudioSignedUrl = await getSignedGetUrl(objectKey, 300)

        // 2. Fal dual-engine
        const tts = await generateSpeech({ text, referenceAudioSignedUrl, language })

        // 3. Fal output → fetch (zırhlı) → R2 public
        const res = await fetch(tts.audioUrl)
        if (!res.ok) throw new Error(`Fal audio fetch failed: ${res.status}`)
        const ctype = res.headers.get('content-type') ?? 'audio/wav'
        if (!ctype.startsWith('audio/')) throw new Error(`Unexpected content-type: ${ctype}`)
        const ext = ctype.includes('mpeg') ? 'mp3' : 'wav'
        const bytes = new Uint8Array(await res.arrayBuffer())
        const publicUrl = await uploadPublicObject(`purchases/${randomUUID()}.${ext}`, bytes, ctype)

        return NextResponse.json({
            ok: true,
            language,
            falUrl: tts.audioUrl,
            falContentType: ctype,
            publicUrl,
            durationMs: tts.durationMs,
            requestId: tts.requestId,
        })
    } catch (error) {
        const { error: msg, code, statusCode } = getErrorResponse(error)
        return NextResponse.json({ error: msg, code }, { status: statusCode })
    }
}
