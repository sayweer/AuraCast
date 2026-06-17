import type { GenerateSpeechOptions, GenerateSpeechResult } from '@/types'
import { VocliraError, ElevenLabsError, VoiceNotFoundError } from '@/lib/errors'

const BASE_URL = 'https://api.elevenlabs.io/v1'

const DEFAULT_TTS_MODEL = 'eleven_v3'
const DEFAULT_TTS_FALLBACK = 'eleven_turbo_v2_5'

// Model used to fine-tune Professional Voice Clones. eleven_v3 does not support PVC
// fine-tuning, so PVC trains against a fine-tune-capable model by default.
const DEFAULT_PVC_MODEL = 'eleven_multilingual_v2'

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

export function getPvcModel(): string {
    return process.env.ELEVENLABS_PVC_MODEL?.trim() || DEFAULT_PVC_MODEL
}

const MIME_TYPE_MAP: Record<string, string> = {
    mp4: 'audio/mp4',
    m4a: 'audio/mp4',
    webm: 'audio/webm',
    ogg: 'audio/ogg',
    wav: 'audio/wav',
    mp3: 'audio/mpeg',
}

function mimeForFile(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() ?? 'webm'
    return MIME_TYPE_MAP[ext] ?? 'audio/webm'
}

function fileBlob(buffer: Buffer, fileName: string): Blob {
    return new Blob([new Uint8Array(buffer)], { type: mimeForFile(fileName) })
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
        throw new VocliraError(
            'Ses örneği çok kısa — en az 60 saniyelik temiz bir kayıt yükleyin.',
            'SAMPLE_TOO_SHORT',
            400
        )
    }
    if (audioBuffer.byteLength > MAX_SAMPLE_BYTES) {
        throw new VocliraError(
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
        throw new VocliraError(
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

// ─── Professional Voice Cloning (PVC) ──────────────────
//
// PVC is asynchronous: create the voice → upload 30min+ of samples → the owner reads a
// captcha aloud to prove consent → training runs for 2-6h → poll fine_tuning state.
// NOTE: an ElevenLabs account has a limited number of PVC slots (Creator/Pro plans ~1),
// so a single shared API key can only hold a few PVC voices at once.

interface PvcSampleResult {
    sample_id: string
    duration_secs?: number
}

export type PvcFineTuneState =
    | 'not_started'
    | 'queued'
    | 'fine_tuning'
    | 'fine_tuned'
    | 'failed'
    | 'delayed'

/** Create an empty PVC voice (metadata only). Returns the new voice_id. */
export async function createPvcVoice(
    name: string,
    language: string,
    description?: string
): Promise<string> {
    const res = await fetch(`${BASE_URL}/voices/pvc`, {
        method: 'POST',
        headers: {
            'xi-api-key': apiKey(),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, language, description: description ?? null }),
    })

    if (!res.ok) {
        // 403 (and often 400) here means the account has no free PVC slot or the plan
        // does not include PVC. Surface a clear, actionable error to the creator.
        if (res.status === 403 || res.status === 400) {
            const detail = await res.text().catch(() => '')
            console.error(`[ElevenLabs] createPvcVoice HTTP ${res.status}: ${detail}`)
            throw new VocliraError(
                'PVC kapasitesi şu anda dolu. Lütfen IVC ile devam edin ya da daha sonra tekrar deneyin.',
                'PVC_SLOT_FULL',
                409
            )
        }
        return handleError(res)
    }

    const json = (await res.json()) as { voice_id: string }
    return json.voice_id
}

/** Upload audio samples to a PVC voice. Returns total sample duration in seconds. */
export async function addPvcSamples(
    voiceId: string,
    files: Array<{ buffer: Buffer; fileName: string }>
): Promise<number> {
    const form = new FormData()
    for (const f of files) {
        form.append('files', fileBlob(f.buffer, f.fileName), f.fileName)
    }

    const res = await fetch(`${BASE_URL}/voices/pvc/${voiceId}/samples`, {
        method: 'POST',
        headers: { 'xi-api-key': apiKey() },
        body: form,
    })

    if (!res.ok) return handleError(res)

    const json = (await res.json()) as PvcSampleResult[]
    return json.reduce((sum, s) => sum + (s.duration_secs ?? 0), 0)
}

/**
 * Fetch the verification captcha for a PVC voice. The captcha is an image containing
 * text the voice owner must read aloud. Returned as a base64 data URL ready for <img>.
 */
export async function getPvcCaptcha(voiceId: string): Promise<string> {
    const res = await fetch(`${BASE_URL}/voices/pvc/${voiceId}/verification/captcha`, {
        method: 'GET',
        headers: { 'xi-api-key': apiKey() },
    })

    if (!res.ok) return handleError(res)

    const contentType = res.headers.get('content-type') ?? ''
    const buf = Buffer.from(await res.arrayBuffer())
    const imageType = contentType.startsWith('image/') ? contentType : 'image/png'
    return `data:${imageType};base64,${buf.toString('base64')}`
}

/** Submit the owner's recording of the captcha text to verify consent. */
export async function verifyPvcCaptcha(voiceId: string, recording: Buffer, fileName = 'captcha.webm'): Promise<void> {
    const form = new FormData()
    form.append('recording', fileBlob(recording, fileName), fileName)

    const res = await fetch(`${BASE_URL}/voices/pvc/${voiceId}/verification/captcha/verify`, {
        method: 'POST',
        headers: { 'xi-api-key': apiKey() },
        body: form,
    })

    if (!res.ok) {
        const detail = await res.text().catch(() => '')
        console.error(`[ElevenLabs] verifyPvcCaptcha HTTP ${res.status}: ${detail}`)
        throw new VocliraError(
            'Ses doğrulaması başarısız oldu. Metni net biçimde okuduğunuzdan emin olup tekrar deneyin.',
            'PVC_CAPTCHA_FAILED',
            422
        )
    }
}

/** Kick off PVC fine-tuning against the configured PVC model. */
export async function trainPvcVoice(voiceId: string, modelId: string = getPvcModel()): Promise<void> {
    const res = await fetch(`${BASE_URL}/voices/pvc/${voiceId}/train`, {
        method: 'POST',
        headers: {
            'xi-api-key': apiKey(),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model_id: modelId }),
    })

    if (!res.ok) return handleError(res)
}

/** Poll a PVC voice's fine-tuning state for the configured model. */
export async function getPvcFineTuneState(
    voiceId: string,
    modelId: string = getPvcModel()
): Promise<{ state: PvcFineTuneState; progress: number }> {
    const res = await fetch(`${BASE_URL}/voices/${voiceId}`, {
        method: 'GET',
        headers: { 'xi-api-key': apiKey() },
    })

    if (!res.ok) return handleError(res)

    const json = (await res.json()) as {
        fine_tuning?: {
            state?: Record<string, PvcFineTuneState>
            progress?: Record<string, number>
        }
    }

    const state = json.fine_tuning?.state?.[modelId] ?? 'not_started'
    const progress = json.fine_tuning?.progress?.[modelId] ?? 0
    return { state, progress }
}
