import { fal } from '@fal-ai/client'
import { TtsError } from '@/lib/errors'
import type { Mood } from '@/types'

// Dual-engine Chatterbox via Fal.ai:
//   tr → multilingual (no paralinguistic tags)
//   en → turbo (supports [laugh]/[sigh]/[gasp]/[chuckle]/[cough])
// Model IDs come from env (verified format: fal-ai/chatterbox/text-to-speech/{turbo,multilingual}).
const TURBO_MODEL = () => requireEnv('FAL_CHATTERBOX_TURBO_MODEL')
const MULTILINGUAL_MODEL = () => requireEnv('FAL_CHATTERBOX_MULTILINGUAL_MODEL')

function requireEnv(name: string): string {
    const value = process.env[name]
    if (!value) {
        throw new TtsError(`Missing required env: ${name}`)
    }
    return value
}

// X-Fal-Store-IO is not a first-class subscribe option in @fal-ai/client@1.10.1,
// so we inject it globally via requestMiddleware (keeps sensitive payloads out of
// Fal's dashboard history). Object lifecycle is passed per-call via storageSettings.
let configured = false
function ensureConfigured(): void {
    if (configured) return
    fal.config({
        requestMiddleware: async (request) => {
            request.headers = { ...request.headers, 'X-Fal-Store-IO': '0' }
            return request
        },
    })
    configured = true
}

// Turbo returns { audio: "url" } (string); Multilingual returns { audio: { url } } (nested).
function extractFalAudioUrl(data: unknown): string {
    const d = data as { audio?: string | { url?: string } }
    if (typeof d?.audio === 'string') return d.audio
    if (d?.audio && typeof d.audio === 'object' && typeof d.audio.url === 'string') {
        return d.audio.url
    }
    throw new TtsError('Fal audio URL not found in response')
}

// Mood → Chatterbox acoustic delivery. The message text is NEVER altered — mood only
// steers the model's native expressiveness knobs. Multilingual (tr) exposes `exaggeration`
// (0.25–2, emotion intensity) + `cfg_scale` (0–1, pacing; lower = slower/more deliberate).
// Turbo (en) only exposes `temperature`, so en mood is milder.
const MOOD_MULTILINGUAL: Record<Mood, { exaggeration: number; cfg_scale: number }> = {
    calm:     { exaggeration: 0.35, cfg_scale: 0.5 },
    sad:      { exaggeration: 0.3,  cfg_scale: 0.3 },
    happy:    { exaggeration: 0.7,  cfg_scale: 0.5 },
    excited:  { exaggeration: 1.0,  cfg_scale: 0.6 },
    angry:    { exaggeration: 0.85, cfg_scale: 0.65 },
    romantic: { exaggeration: 0.5,  cfg_scale: 0.35 },
}

const MOOD_TURBO_TEMPERATURE: Record<Mood, number> = {
    calm: 0.6, sad: 0.6, happy: 0.85, excited: 1.0, angry: 0.95, romantic: 0.7,
}

export interface GenerateSpeechParams {
    text: string
    referenceAudioSignedUrl: string // short-lived signed GET URL to the creator's reference WAV
    language: 'tr' | 'en'
    mood: Mood
}

export interface TtsResult {
    audioUrl: string // Fal CDN url (ephemeral — must be copied to R2 by caller)
    durationMs: number
    requestId: string
}

export async function generateSpeech({
    text,
    referenceAudioSignedUrl,
    language,
    mood,
}: GenerateSpeechParams): Promise<TtsResult> {
    ensureConfigured()
    const start = Date.now()

    const modelId = language === 'en' ? TURBO_MODEL() : MULTILINGUAL_MODEL()
    const input =
        language === 'en'
            ? { text, audio_url: referenceAudioSignedUrl, temperature: MOOD_TURBO_TEMPERATURE[mood] }
            : {
                  text,
                  voice: referenceAudioSignedUrl,
                  custom_audio_language: 'turkish',
                  temperature: 0.8,
                  ...MOOD_MULTILINGUAL[mood],
              }

    try {
        const result = await fal.subscribe(modelId, {
            input: input as Record<string, unknown>,
            storageSettings: { expiresIn: '1h' },
        })
        return {
            audioUrl: extractFalAudioUrl(result.data),
            durationMs: Date.now() - start,
            requestId: result.requestId,
        }
    } catch (err) {
        if (err instanceof TtsError) throw err
        const message = err instanceof Error ? err.message : String(err)
        // Fal'ın ham hata gövdesi debug için kritik (kredi mi, signed-URL okuma mı, vb.)
        const body = (err as { body?: unknown })?.body
        console.error('[tts] Fal generation failed:', message, body ? JSON.stringify(body) : '')
        throw new TtsError(`Fal generation failed: ${message}`)
    }
}
