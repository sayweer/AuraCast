'use client'

import { useRef, useState, useCallback, useEffect } from 'react'

const getSupportedMimeType = (): string => {
  const types = [
    'audio/mp4',
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ]
  for (const type of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) return type
  }
  return ''
}

export type RecorderError = 'permission' | 'access' | null

export interface VoiceRecorder {
  isRecording: boolean
  seconds: number
  blob: Blob | null
  mimeType: string
  error: RecorderError
  start: () => Promise<void>
  stop: () => void
  reset: () => void
}

/**
 * Minimal MediaRecorder wrapper used by both the IVC sample recorder and the PVC
 * captcha verification step. Handles getUserMedia, recording, an elapsed-seconds timer,
 * and stream cleanup. Returns the recorded Blob once stopped.
 */
export function useVoiceRecorder(): VoiceRecorder {
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [isRecording, setIsRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [mimeType, setMimeType] = useState('audio/webm')
  const [error, setError] = useState<RecorderError>(null)

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const start = useCallback(async () => {
    setError(null)
    setBlob(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mt = getSupportedMimeType()
      const rec = new MediaRecorder(stream, mt ? { mimeType: mt } : undefined)
      recorderRef.current = rec
      chunksRef.current = []

      rec.ondataavailable = (e) => chunksRef.current.push(e.data)
      rec.onstop = () => {
        const effective = mt || 'audio/webm'
        setBlob(new Blob(chunksRef.current, { type: effective }))
        setMimeType(effective)
        cleanupStream()
        setIsRecording(false)
      }

      rec.start()
      setSeconds(0)
      setIsRecording(true)
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
    } catch (err) {
      cleanupStream()
      const isPerm =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
      setError(isPerm ? 'permission' : 'access')
      setIsRecording(false)
    }
  }, [])

  const stop = useCallback(() => {
    recorderRef.current?.stop()
  }, [])

  const reset = useCallback(() => {
    setBlob(null)
    setSeconds(0)
    setError(null)
  }, [])

  useEffect(() => () => cleanupStream(), [])

  return { isRecording, seconds, blob, mimeType, error, start, stop, reset }
}
