'use client'

import { useState } from 'react'
import { Mic, Square, RotateCcw, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/components/LanguageProvider'
import { useVoiceRecorder } from '@/lib/useVoiceRecorder'

interface PvcCaptchaProps {
  captchaImage: string | null
  isSubmitting: boolean
  error: string | null
  onSubmit: (recording: Blob, mimeType: string) => void
}

/**
 * PVC consent verification step: the creator reads the text shown in the captcha image
 * aloud and records it. The recording is submitted to ElevenLabs to prove voice ownership.
 */
export function PvcCaptcha({ captchaImage, isSubmitting, error, onSubmit }: PvcCaptchaProps) {
  const { t } = useLanguage()
  const recorder = useVoiceRecorder()
  const [hasRecorded, setHasRecorded] = useState(false)

  const handleRecordClick = async () => {
    if (recorder.isRecording) {
      recorder.stop()
      setHasRecorded(true)
    } else {
      await recorder.start()
    }
  }

  const handleSubmit = () => {
    if (recorder.blob) onSubmit(recorder.blob, recorder.mimeType)
  }

  const micErr =
    recorder.error === 'permission'
      ? t('onboarding.micPermissionDenied')
      : recorder.error === 'access'
        ? t('onboarding.micAccessError')
        : null

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h2 className="font-display text-2xl font-bold">{t('onboarding.captchaTitle')}</h2>
        <p className="text-muted-foreground text-sm">{t('onboarding.captchaSubtitle')}</p>
      </div>

      {/* Captcha image to read aloud */}
      <div className="bg-black/40 border border-border rounded-lg p-3 flex items-center justify-center min-h-[120px]">
        {captchaImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={captchaImage} alt="" className="max-w-full rounded" />
        ) : (
          <span className="text-sm text-muted-foreground">{t('onboarding.captchaLoading')}</span>
        )}
      </div>

      {/* Recorder */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={handleRecordClick}
          disabled={!captchaImage || isSubmitting}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all text-primary-foreground disabled:opacity-50 ${
            recorder.isRecording ? 'bg-ember-3 pulse-ring' : 'bg-primary hover:bg-secondary'
          }`}
        >
          {recorder.isRecording ? <Square className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
        </button>
        <p className="text-sm text-muted-foreground">
          {recorder.isRecording
            ? t('onboarding.captchaRecordStop')
            : hasRecorded && recorder.blob
              ? t('onboarding.captchaReRecord')
              : t('onboarding.captchaRecordStart')}
        </p>
        {micErr && <p className="text-sm text-red-400 text-center max-w-xs">{micErr}</p>}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!recorder.blob || recorder.isRecording || isSubmitting}
        className="w-full bg-primary text-primary-foreground hover:bg-secondary disabled:bg-primary/30 disabled:text-primary/50"
      >
        {isSubmitting ? (
          <>
            <RotateCw className="w-4 h-4 mr-2 animate-spin" />
            {t('onboarding.captchaSubmitting')}
          </>
        ) : (
          <>
            <RotateCcw className="w-4 h-4 mr-2" />
            {t('onboarding.captchaSubmit')}
          </>
        )}
      </Button>

      {error && <p className="text-sm text-red-400 text-center">{error}</p>}
    </div>
  )
}
