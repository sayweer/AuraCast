import type { GenerateSpeechOptions, GenerateSpeechResult } from '@/types'
import { ElevenLabsError, VoiceNotFoundError } from '@/lib/errors'

const BASE_URL = 'https://api.elevenlabs.io/v1'
const apiKey = () => process.env.ELEVENLABS_API_KEY ?? ''

interface CloneVoiceResponse {
  voice_id: string
}

async function handleError(res: Response): Promise<never> {
  const text = await res.text().catch(() => res.statusText)
  if (res.status === 404) {
    throw new VoiceNotFoundError(res.url)
  }
  throw new ElevenLabsError(`ElevenLabs error: ${text}`, res.status)
}

export async function cloneVoice(
  audioBuffer: Buffer,
  fileName: string,
  creatorName: string
): Promise<string> {
  const form = new FormData()
  form.append('name', creatorName)
  form.append('files', new Blob([new Uint8Array(audioBuffer)], { type: 'audio/mpeg' }), fileName)

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
    model_id: 'eleven_turbo_v2',
    voice_settings: {
      stability: options.voiceSettings?.stability ?? 0.5,
      similarity_boost: options.voiceSettings?.similarity_boost ?? 0.8,
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
