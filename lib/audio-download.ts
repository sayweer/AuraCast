export type DownloadResult = 'shared' | 'downloaded' | 'opened-new-tab' | 'cancelled' | 'failed'

interface DownloadOptions {
    base64: string
    filename: string
    mimeType?: string
}

function isIOSSafari(): boolean {
    if (typeof navigator === 'undefined' || typeof document === 'undefined') return false
    const ua = navigator.userAgent
    const iOS =
        /iPad|iPhone|iPod/.test(ua) ||
        (ua.includes('Mac') && 'ontouchend' in document)
    const webkitNotChrome = /WebKit/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
    return iOS && webkitNotChrome
}

function base64ToBlob(base64: string, mimeType: string): Blob {
    const binary = atob(base64)
    const chunkSize = 8 * 1024
    const chunks: Uint8Array[] = []
    for (let offset = 0; offset < binary.length; offset += chunkSize) {
        const end = Math.min(offset + chunkSize, binary.length)
        const slice = new Uint8Array(end - offset)
        for (let i = offset; i < end; i++) {
            slice[i - offset] = binary.charCodeAt(i)
        }
        chunks.push(slice)
    }
    return new Blob(chunks, { type: mimeType })
}

function triggerAnchorDownload(blob: Blob, filename: string): boolean {
    try {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.rel = 'noopener'
        a.style.display = 'none'
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
        return true
    } catch (err) {
        console.error('[audio-download] anchor click failed:', err)
        return false
    }
}

function openInNewTab(blob: Blob): boolean {
    try {
        const url = URL.createObjectURL(blob)
        const win = window.open(url, '_blank')
        setTimeout(() => URL.revokeObjectURL(url), 30_000)
        return win !== null
    } catch (err) {
        console.error('[audio-download] window.open failed:', err)
        return false
    }
}

export async function downloadAudio(opts: DownloadOptions): Promise<DownloadResult> {
    const mimeType = opts.mimeType ?? 'audio/mpeg'

    let blob: Blob
    try {
        blob = base64ToBlob(opts.base64, mimeType)
    } catch (err) {
        console.error('[audio-download] base64 decode failed:', err)
        return 'failed'
    }

    // iOS Safari: <a download> is ignored on blob/data URLs. The only reliable
    // path is Web Share API → user picks "Save to Files" / AirDrop / Messages.
    if (isIOSSafari()) {
        const shareFn = typeof navigator !== 'undefined' ? navigator.share : undefined
        const canShareFn = typeof navigator !== 'undefined' ? navigator.canShare : undefined
        if (typeof shareFn === 'function') {
            const file = new File([blob], opts.filename, { type: mimeType })
            const shareData: ShareData = { files: [file], title: opts.filename }
            const canShare = typeof canShareFn === 'function' ? canShareFn.call(navigator, shareData) : true
            if (canShare) {
                try {
                    await navigator.share(shareData)
                    return 'shared'
                } catch (err) {
                    if (err instanceof Error && err.name === 'AbortError') {
                        return 'cancelled'
                    }
                    console.warn('[audio-download] navigator.share failed, falling back:', err)
                }
            }
        }
    }

    if (triggerAnchorDownload(blob, opts.filename)) {
        return 'downloaded'
    }

    if (openInNewTab(blob)) {
        return 'opened-new-tab'
    }

    return 'failed'
}
