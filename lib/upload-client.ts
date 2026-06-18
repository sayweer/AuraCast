import { toReferenceWav } from './audio-wav'

interface UploadUrlResponse {
  success: boolean
  uploadSessionId: string
  uploadUrl: string
  contentType: string
  error?: string
}

/**
 * Converts a recorded audio Blob to a 24kHz mono WAV, requests a one-time presigned
 * PUT URL for the given upload type, uploads the WAV directly to the private R2 bucket,
 * and returns the upload-session id that /api/creator/register consumes.
 *
 * The PUT Content-Type must match the presign exactly (audio/wav) or R2 returns 403.
 */
export async function uploadReferenceAudio(
  blob: Blob,
  walletAddress: string,
  type: 'voice-profile' | 'verification-audio',
): Promise<string> {
  const wav = await toReferenceWav(blob)

  const urlRes = await fetch('/api/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress, type }),
  })
  const urlData = (await urlRes.json().catch(() => null)) as UploadUrlResponse | null
  if (!urlRes.ok || !urlData?.success) {
    throw new Error(urlData?.error ?? 'Yükleme bağlantısı alınamadı.')
  }

  const putRes = await fetch(urlData.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': urlData.contentType },
    body: wav,
  })
  if (!putRes.ok) {
    throw new Error(`Ses yüklenemedi (HTTP ${putRes.status}).`)
  }

  return urlData.uploadSessionId
}
