// Client-side audio normalization for voice reference samples.
// Browser MediaRecorder yields WebM/Opus (typically 48kHz stereo), but Chatterbox
// expects 24kHz mono 16-bit PCM WAV. This decodes → downmixes to mono → resamples
// to 24kHz → encodes a 16-bit PCM WAV Blob, ready for direct R2 upload.

const TARGET_SAMPLE_RATE = 24000

/** Converts any browser-decodable audio Blob (e.g. WebM/Opus) to a 24kHz mono 16-bit WAV Blob. */
export async function toReferenceWav(input: Blob): Promise<Blob> {
    const arrayBuffer = await input.arrayBuffer()

    // Decode using a regular AudioContext (broadest codec support, incl. WebM/Opus).
    const decodeCtx = new AudioContext()
    let decoded: AudioBuffer
    try {
        decoded = await decodeCtx.decodeAudioData(arrayBuffer.slice(0))
    } finally {
        await decodeCtx.close()
    }

    // Resample + downmix to mono at 24kHz via OfflineAudioContext.
    const frameCount = Math.ceil(decoded.duration * TARGET_SAMPLE_RATE)
    const offline = new OfflineAudioContext(1, frameCount, TARGET_SAMPLE_RATE)
    const source = offline.createBufferSource()
    source.buffer = decoded
    source.connect(offline.destination)
    source.start(0)
    const rendered = await offline.startRendering()

    return encodeWav16(rendered.getChannelData(0), TARGET_SAMPLE_RATE)
}

/** Encodes a mono Float32 PCM channel as a 16-bit PCM WAV Blob. */
function encodeWav16(samples: Float32Array, sampleRate: number): Blob {
    const dataLength = samples.length * 2 // 16-bit = 2 bytes/sample
    const buffer = new ArrayBuffer(44 + dataLength)
    const view = new DataView(buffer)

    const writeString = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
    }

    // RIFF header
    writeString(0, 'RIFF')
    view.setUint32(4, 36 + dataLength, true)
    writeString(8, 'WAVE')
    // fmt chunk
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true) // chunk size
    view.setUint16(20, 1, true) // PCM
    view.setUint16(22, 1, true) // mono
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * 2, true) // byte rate (sampleRate * blockAlign)
    view.setUint16(32, 2, true) // block align (channels * bytesPerSample)
    view.setUint16(34, 16, true) // bits per sample
    // data chunk
    writeString(36, 'data')
    view.setUint32(40, dataLength, true)

    // PCM samples (clamp + scale to int16)
    let offset = 44
    for (let i = 0; i < samples.length; i++) {
        const s = Math.max(-1, Math.min(1, samples[i]))
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
        offset += 2
    }

    return new Blob([view], { type: 'audio/wav' })
}
