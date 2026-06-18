'use client'

// TEMPORARY — Faz 0 vertical slice test sayfası. Migration kanıtlanınca SİLİNECEK.
// Mikrofon kaydı → 24kHz mono WAV → presigned PUT (R2 CORS testi) → Fal → R2 public playback.
import { useState, useRef } from 'react'
import { toReferenceWav } from '@/lib/audio-wav'

type Status = 'idle' | 'recording' | 'converting' | 'uploading' | 'generating' | 'done' | 'error'

export default function Faz0TestPage() {
    const [status, setStatus] = useState<Status>('idle')
    const [language, setLanguage] = useState<'tr' | 'en'>('tr')
    const [text, setText] = useState('Merhaba, bu bir Voclira ses testi.')
    const [objectKey, setObjectKey] = useState<string | null>(null)
    const [result, setResult] = useState<unknown>(null)
    const [error, setError] = useState<string | null>(null)

    const recorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])

    async function startRecording() {
        setError(null)
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const rec = new MediaRecorder(stream)
        chunksRef.current = []
        rec.ondataavailable = (e) => chunksRef.current.push(e.data)
        rec.onstop = () => {
            stream.getTracks().forEach((t) => t.stop())
            void handleRecorded(new Blob(chunksRef.current, { type: rec.mimeType }))
        }
        recorderRef.current = rec
        rec.start()
        setStatus('recording')
    }

    function stopRecording() {
        recorderRef.current?.stop()
    }

    async function handleRecorded(webm: Blob) {
        try {
            setStatus('converting')
            const wav = await toReferenceWav(webm)

            setStatus('uploading')
            const presign = await fetch('/api/faz0?contentType=audio/wav').then((r) => r.json())
            if (presign.error) throw new Error(presign.error)
            const put = await fetch(presign.uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': 'audio/wav' }, // presigned ile birebir eşleşmeli
                body: wav,
            })
            if (!put.ok) throw new Error(`R2 PUT failed: ${put.status} (CORS / Content-Type?)`)
            setObjectKey(presign.objectKey)

            setStatus('generating')
            const gen = await fetch('/api/faz0', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ objectKey: presign.objectKey, language, text }),
            }).then((r) => r.json())
            if (gen.error) throw new Error(gen.error)
            setResult(gen)
            setStatus('done')
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e))
            setStatus('error')
        }
    }

    const r = result as { publicUrl?: string; durationMs?: number; requestId?: string; falContentType?: string } | null

    return (
        <div style={{ maxWidth: 640, margin: '40px auto', fontFamily: 'system-ui', padding: 16 }}>
            <h1>Faz 0 — Vertical Slice Test</h1>
            <p style={{ color: '#666' }}>R2 CORS + WAV + Fal + public playback zincirini kanıtlar.</p>

            <div style={{ margin: '16px 0' }}>
                <label>
                    Dil:{' '}
                    <select value={language} onChange={(e) => setLanguage(e.target.value as 'tr' | 'en')}>
                        <option value="tr">Türkçe (Multilingual)</option>
                        <option value="en">English (Turbo)</option>
                    </select>
                </label>
            </div>

            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                style={{ width: '100%', marginBottom: 16 }}
            />

            <div style={{ display: 'flex', gap: 8 }}>
                {status !== 'recording' ? (
                    <button onClick={startRecording} disabled={['converting', 'uploading', 'generating'].includes(status)}>
                        🎤 Kaydı Başlat (8-10 sn)
                    </button>
                ) : (
                    <button onClick={stopRecording}>⏹ Durdur & Üret</button>
                )}
            </div>

            <p style={{ marginTop: 16 }}>
                Durum: <strong>{status}</strong>
            </p>
            {objectKey && <p style={{ fontSize: 12, color: '#888' }}>objectKey: {objectKey}</p>}

            {error && <pre style={{ color: 'crimson', whiteSpace: 'pre-wrap' }}>HATA: {error}</pre>}

            {r?.publicUrl && (
                <div style={{ marginTop: 16 }}>
                    <p>✅ Üretildi ({r.durationMs}ms, {r.falContentType}, req: {r.requestId})</p>
                    <audio controls src={r.publicUrl} style={{ width: '100%' }} />
                    <p style={{ fontSize: 12, wordBreak: 'break-all' }}>{r.publicUrl}</p>
                </div>
            )}
        </div>
    )
}
