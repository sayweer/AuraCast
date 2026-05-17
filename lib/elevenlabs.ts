import type { GenerateSpeechOptions, GenerateSpeechResult } from '@/types'
import { ElevenLabsError, VoiceNotFoundError } from '@/lib/errors'

const BASE_URL = 'https://api.elevenlabs.io/v1'

function apiKey(): string {
    const key = process.env.ELEVENLABS_API_KEY
    if (!key) {
        throw new ElevenLabsError('ElevenLabs API key is not configured', 0)
    }
    return key
}

interface CloneVoiceResponse {
    voice_id: string
}

async function handleError(res: Response): Promise<never> {
    const text = await res.text().catch(() => res.statusText)
    // Log the full error server-side for debugging
    console.error(`[ElevenLabs] HTTP ${res.status}: ${text}`)
    if (res.status === 404) {
        throw new VoiceNotFoundError('requested voice')
    }
    // Return a sanitized error message to the client — do not expose raw API response
    throw new ElevenLabsError('Voice service encountered an error', res.status)
}

export async function cloneVoice(
    audioBuffer: Buffer,
    fileName: string,
    creatorName: string
): Promise<string> {
    const mimeTypeMap: Record<string, string> = {
        mp4: 'audio/mp4',
        m4a: 'audio/mp4',
        webm: 'audio/webm',
        ogg: 'audio/ogg',
        wav: 'audio/wav',
        mp3: 'audio/mpeg',
    }
    const ext = fileName.split('.').pop() ?? 'webm'
    const fileMimeType = mimeTypeMap[ext] ?? 'audio/webm'

    const form = new FormData()
    form.append('name', creatorName)
    form.append('files', new Blob([new Uint8Array(audioBuffer)], { type: fileMimeType }), fileName)

    const res = await fetch(`${BASE_URL}/voices/add`, {
        method: 'POST',
        headers: { 'xi-api-key': apiKey() },
        body: form,
    })

    if (!res.ok) return handleError(res)

    const json = (await res.json()) as CloneVoiceResponse
    return json.voice_id
}

export async function generateSpeech(
    options: GenerateSpeechOptions
): Promise<GenerateSpeechResult> {
    const start = Date.now()

    const body = JSON.stringify({
        text: options.text,
        model_id: 'eleven_multilingual_v2',
        language_code: options.language ?? 'en',
        voice_settings: {
            stability: options.voiceSettings?.stability ?? 0.7,
            similarity_boost: options.voiceSettings?.similarity_boost ?? 0.85,
            use_speaker_boost: true,
        },
    })

    const doRequest = () =>
        fetch(`${BASE_URL}/text-to-speech/${options.voiceId}`, {
            method: 'POST',
            headers: {
                'xi-api-key': apiKey(),
                'Content-Type': 'application/json',
                Accept: 'audio/mpeg',
            },
            body,
        })

    let res = await doRequest()

    if (res.status === 429) {
        await new Promise<void>((r) => setTimeout(r, 1000))
        res = await doRequest()
    }

    if (!res.ok) return handleError(res)

    const arrayBuffer = await res.arrayBuffer()
    const audioBase64 = Buffer.from(arrayBuffer).toString('base64')

    return { audioBase64, durationMs: Date.now() - start }
}

export async function deleteVoice(voiceId: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/voices/${voiceId}`, {
        method: 'DELETE',
        headers: { 'xi-api-key': apiKey() },
    })

    if (res.status === 404) return
    if (!res.ok) return handleError(res)
}
