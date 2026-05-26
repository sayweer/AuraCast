import type { GenerateSpeechOptions, GenerateSpeechResult } from '@/types'
import { AuraCastError, ElevenLabsError, VoiceNotFoundError } from '@/lib/errors'

const BASE_URL = 'https://api.elevenlabs.io/v1'

const DEFAULT_TTS_MODEL = 'eleven_v3'
const DEFAULT_TTS_FALLBACK = 'eleven_turbo_v2_5'

// Instant Voice Cloning sample size guards (60s @ 64kbps ≈ 480KB; we accept down to ~250KB
// to tolerate variable-bitrate webm/opus from MediaRecorder). Max 25MB hard cap.
const MIN_SAMPLE_BYTES = 250 * 1024
const MAX_SAMPLE_BYTES = 25 * 1024 * 1024

function apiKey(): string {
    const key = process.env.ELEVENLABS_API_KEY
    if (!key) {
        throw new ElevenLabsError('ElevenLabs API key is not configured', 0)
    }
    return key
}

export function getTtsModel(): string {
    return process.env.ELEVENLABS_TTS_MODEL?.trim() || DEFAULT_TTS_MODEL
}

export function getTtsFallbackModel(): string {
    return process.env.ELEVENLABS_TTS_FALLBACK?.trim() || DEFAULT_TTS_FALLBACK
}

function stripAudioTags(text: string): string {
    return text.replace(/\[[^\]]+\]/g, '').replace(/\s{2,}/g, ' ').trim()
}

interface CloneVoiceResponse {
    voice_id: string
}

interface VoiceDetailsResponse {
    voice_id: string
    name: string
}

async function handleError(res: Response): Promise<never> {
    const text = await res.text().catch(() => res.statusText)
    console.error(`[ElevenLabs] HTTP ${res.status}: ${text}`)
    if (res.status === 404) {
        throw new VoiceNotFoundError('requested voice')
    }
    throw new ElevenLabsError('Voice service encountered an error', res.status)
}

export async function cloneVoice(
    audioBuffer: Buffer,
    fileName: string,
    creatorName: string
): Promise<string> {
    if (audioBuffer.byteLength < MIN_SAMPLE_BYTES) {
        throw new AuraCastError(
            'Ses örneği çok kısa — en az 60 saniyelik temiz bir kayıt yükleyin.',
            'SAMPLE_TOO_SHORT',
            400
        )
    }
    if (audioBuffer.byteLength > MAX_SAMPLE_BYTES) {
        throw new AuraCastError(
            'Ses örneği çok büyük — en fazla 25 MB yükleyebilirsiniz.',
            'SAMPLE_TOO_LARGE',
            400
        )
    }

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

export async function verifyClonedVoice(voiceId: string, expectedName: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/voices/${voiceId}`, {
        method: 'GET',
        headers: { 'xi-api-key': apiKey() },
    })

    if (!res.ok) {
        console.error(`[ElevenLabs] verifyClonedVoice failed HTTP ${res.status} for voice_id=${voiceId}`)
        throw new VoiceNotFoundError(voiceId)
    }

    const json = (await res.json()) as VoiceDetailsResponse
    if (json.name?.trim().toLowerCase() !== expectedName.trim().toLowerCase()) {
        console.error(
            `[ElevenLabs] verifyClonedVoice name mismatch: expected="${expectedName}" got="${json.name}" voice_id=${voiceId}`
        )
        throw new AuraCastError(
            'Voice clone verification failed',
            'VOICE_VERIFY_FAILED',
            502
        )
    }
}

async function callTts(
    voiceId: string,
    text: string,
    modelId: string,
    voiceSettings: { stability: number; similarity_boost: number; style: number; use_speaker_boost: boolean },
    language: string | undefined
): Promise<Response> {
    const body = JSON.stringify({
        text,
        model_id: modelId,
        language_code: language ?? 'en',
        voice_settings: voiceSettings,
    })

    const doRequest = () =>
        fetch(`${BASE_URL}/text-to-speech/${voiceId}`, {
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
    return res
}

function isModelError(status: number): boolean {
    // Model-related failures we will retry with the fallback model.
    // 404 = unknown voice (NOT model — do not fallback)
    // 400/422 = bad request / model not supported for this account
    // 401/403 = forbidden — likely model gated for this account
    return status === 400 || status === 401 || status === 403 || status === 422
}

export async function generateSpeech(
    options: GenerateSpeechOptions
): Promise<GenerateSpeechResult> {
    const start = Date.now()

    const voiceSettings = {
        stability: options.voiceSettings?.stability ?? 0.5,
        similarity_boost: options.voiceSettings?.similarity_boost ?? 0.75,
        style: options.voiceSettings?.style ?? 0,
        use_speaker_boost: true,
    }

    const primaryModel = getTtsModel()
    let modelUsed = primaryModel

    let res = await callTts(options.voiceId, options.text, primaryModel, voiceSettings, options.language)

    if (!res.ok && isModelError(res.status)) {
        const fallbackModel = getTtsFallbackModel()
        if (fallbackModel && fallbackModel !== primaryModel) {
            console.warn(
                `[ElevenLabs] TTS model=${primaryModel} failed with HTTP ${res.status}; retrying with fallback=${fallbackModel}`
            )
            const cleanText = stripAudioTags(options.text)
            res = await callTts(options.voiceId, cleanText, fallbackModel, voiceSettings, options.language)
            modelUsed = fallbackModel
        }
    }

    if (!res.ok) return handleError(res)

    const arrayBuffer = await res.arrayBuffer()
    const audioBase64 = Buffer.from(arrayBuffer).toString('base64')

    return { audioBase64, durationMs: Date.now() - start, modelUsed }
}

export async function deleteVoice(voiceId: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/voices/${voiceId}`, {
        method: 'DELETE',
        headers: { 'xi-api-key': apiKey() },
    })

    if (res.status === 404) return
    if (!res.ok) return handleError(res)
}
