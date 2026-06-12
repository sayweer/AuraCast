'use client';

import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, ChevronRight, RotateCw } from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';
import LanguageToggle from '@/components/LanguageToggle';
import { BrandLogo } from '@/components/BrandLogo';
import { WavePath } from '@/components/ui/wave-path';

interface OnboardingProps {
  step: 1 | 2;
  isRecording: boolean;
  recordingSeconds: number;
  audioReady: boolean;
  selectedPrice: number;
  walletAddress: string;
  onStartRecording: () => void;
  onNextStep: () => void;
  onBackStep: () => void;
  onSelectPrice: (price: number) => void;
  onLaunch: () => void;
  onAudioReady: (blob: Blob, mimeType: string) => void;
  isRegistering: boolean;
  registerError: string | null;
  selectedLanguage: 'en' | 'tr';
  onSelectLanguage: (lang: 'en' | 'tr') => void;
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const SCRIPT_EN = `Welcome. My name is recorded here to create my personal voice clone.

I enjoy spending time outdoors, especially on warm sunny days when the sky is perfectly clear. There is something truly special about the way morning light falls through the trees and illuminates everything around you.

When I was younger, I used to read books for hours without stopping. Stories about adventure, science, history, and the mysteries of the universe always fascinated me deeply.

I believe that technology has the power to connect people in ways we never imagined before. Every single day, new ideas emerge that change how we live, how we work, and how we communicate with one another.

Cooking is another thing I genuinely enjoy. The process of combining simple ingredients to create something delicious feels almost like a form of art. My favorite meals are the ones shared with people I care about.

Music has always been a big part of my life. Different songs carry different memories, and sometimes a single melody can take you back to a moment you had almost forgotten.

Thank you for listening. This recording will help create an accurate and natural clone of my voice.`

const SCRIPT_TR = `Merhaba. Kişisel ses klonum oluşturmak için bu kaydı yapıyorum.

Açık havada vakit geçirmeyi çok severim, özellikle güneşin parlak olduğu ve gökyüzünün tertemiz göründüğü sıcak günlerde. Sabah ışığının ağaçların arasından süzülüp her yanı aydınlatma biçiminde gerçekten çok özel bir şey var.

Küçükken saatlerce durmadan kitap okurdum. Macera, bilim, tarih ve evrenin gizemlerine dair hikayeler her zaman derin bir şekilde ilgimi çekmiştir.

Teknolojinin insanları daha önce hiç hayal edemediğimiz biçimlerde birbirine bağlama gücüne sahip olduğuna inanıyorum. Her geçen gün, yaşama, çalışma ve birbirimizle iletişim kurma şeklimizi değiştiren yeni fikirler ortaya çıkıyor.

Yemek yapmak da gerçekten keyif aldığım bir şey. Basit malzemeleri bir araya getirerek lezzetli bir şey yaratma süreci neredeyse bir sanat formu gibi hissettiriyor. En sevdiğim yemekler, önem verdiğim insanlarla paylaştıklarım.

Müzik her zaman hayatımın büyük bir parçası olmuştur. Farklı şarkılar farklı anılar taşır ve bazen tek bir melodi sizi neredeyse unuttuğunuz bir ana geri götürebilir.

Dinlediğiniz için teşekkürler. Bu kayıt, sesimin doğru ve doğal bir klonunu oluşturmama yardımcı olacak.`

const priceOptions = [0.01, 0.03, 0.05, 0.08, 0.1];
const usdPrices: Record<number, number> = {
  0.01: 1.5,
  0.03: 4.5,
  0.05: 7.5,
  0.08: 12,
  0.1: 15,
};

export default function Onboarding({
  step,
  isRecording,
  recordingSeconds,
  audioReady,
  selectedPrice,
  walletAddress,
  onStartRecording,
  onNextStep,
  onBackStep,
  onSelectPrice,
  onLaunch,
  onAudioReady,
  isRegistering,
  registerError,
  selectedLanguage,
  onSelectLanguage,
}: OnboardingProps) {
  const { t } = useLanguage()
  const truncatedAddress = walletAddress.substring(0, 6) + '...' + walletAddress.substring(walletAddress.length - 6);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const [micError, setMicError] = useState<string | null>(null)
  const [savedDuration, setSavedDuration] = useState(0)
  const recordingSecondsRef = useRef(recordingSeconds)
  useEffect(() => { recordingSecondsRef.current = recordingSeconds }, [recordingSeconds])

  // Canvas visualizer refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const smoothVolumeRef = useRef<number>(0)
  const phaseRef = useRef<number>(0)
  const isRecordingRef = useRef<boolean>(isRecording)

  // Update isRecordingRef so visualizer loop knows current recording state
  useEffect(() => {
    isRecordingRef.current = isRecording
  }, [isRecording])

  // Setup visualizer animation loop
  useEffect(() => {
    let active = true

    const draw = () => {
      if (!active) return

      const canvas = canvasRef.current
      if (!canvas) {
        animationFrameRef.current = requestAnimationFrame(draw)
        return
      }

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        animationFrameRef.current = requestAnimationFrame(draw)
        return
      }

      const W = canvas.width
      const H = canvas.height

      // Clear with transparent background
      ctx.clearRect(0, 0, W, H)

      let targetVolume = 0
      if (isRecordingRef.current && analyserRef.current) {
        const analyser = analyserRef.current
        const bufferLength = analyser.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)
        analyser.getByteTimeDomainData(dataArray)

        let sum = 0
        for (let i = 0; i < bufferLength; i++) {
          const v = (dataArray[i] - 128) / 128
          sum += v * v
        }
        const rms = Math.sqrt(sum / bufferLength)
        // Boost sensitivity by a factor of 4.5 so waves react strongly to normal speech
        targetVolume = Math.min(rms * 4.5, 1.0)
      }

      // Smooth the volume change to prevent sudden jittering
      smoothVolumeRef.current = smoothVolumeRef.current * 0.82 + targetVolume * 0.18

      // Wave speed modulates slightly with input volume
      const speed = 0.05 + smoothVolumeRef.current * 0.14
      phaseRef.current += speed

      const centerY = H / 2
      const baseAmplitude = isRecordingRef.current ? 12 : 2.5 // More visible idle breathing wave
      const voiceAmplitude = smoothVolumeRef.current * (H * 0.70) // Let voice drive up to 70% of canvas height
      const totalAmplitude = baseAmplitude + voiceAmplitude

      // Wave configurations: frequency, multiplier, gradient, alpha, and phase offset
      const waves = [
        {
          frequency: 2.0,
          amplitudeMult: 1.0,
          colorStart: '#9B0F06', // Ember Red
          colorEnd: '#D53E0F',   // Ember Orange
          alpha: 0.95,
          phaseOffset: 0,
        },
        {
          frequency: 3.5,
          amplitudeMult: 0.7,
          colorStart: '#D53E0F', // Ember Orange
          colorEnd: '#EED9B9',   // Cream
          alpha: 0.6,
          phaseOffset: Math.PI / 3,
        },
        {
          frequency: 5.0,
          amplitudeMult: 0.4,
          colorStart: '#5E0006', // Bordeaux
          colorEnd: '#9B0F06',   // Ember Red
          alpha: 0.4,
          phaseOffset: (Math.PI * 2) / 3,
        },
      ]

      waves.forEach((w) => {
        ctx.beginPath()
        ctx.lineWidth = w.amplitudeMult === 1.0 ? 4.5 : 2.0 // Thicker lines for better neon presence

        // Create linear gradient for smooth neon color transitions
        const grad = ctx.createLinearGradient(0, 0, W, 0)
        grad.addColorStop(0, hexToRgba(w.colorStart, w.alpha * 0.15))
        grad.addColorStop(0.5, hexToRgba(w.colorEnd, w.alpha))
        grad.addColorStop(1, hexToRgba(w.colorStart, w.alpha * 0.15))
        ctx.strokeStyle = grad

        // Apply a glowing neon shadow for the primary wave
        if (w.amplitudeMult === 1.0) {
          ctx.shadowBlur = 15 // Increased blur for stronger glow
          ctx.shadowColor = hexToRgba(w.colorEnd, 0.7)
        } else {
          ctx.shadowBlur = 0
        }

        // Draw sine wave path
        for (let x = 0; x <= W; x += 2) {
          const t = x / W
          // Reduced pinch exponent to 1.8 for fuller, more pronounced waves in the center
          const envelope = Math.pow(Math.sin(t * Math.PI), 1.8)

          const angle = t * w.frequency * Math.PI * 2 + phaseRef.current + w.phaseOffset
          const y = centerY + Math.sin(angle) * totalAmplitude * w.amplitudeMult * envelope

          if (x === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }
        ctx.stroke()
      })

      animationFrameRef.current = requestAnimationFrame(draw)
    }

    // Helper helper to convert hex to rgba
    const hexToRgba = (hex: string, alpha: number) => {
      const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i
      const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b)
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex)
      return result
        ? `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`
        : `rgba(255, 255, 255, ${alpha})`
    }

    animationFrameRef.current = requestAnimationFrame(draw)

    return () => {
      active = false
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  const startVisualization = (stream: MediaStream) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      const audioContext = new AudioContextClass()
      audioContextRef.current = audioContext

      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyserRef.current = analyser

      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)
      sourceRef.current = source
    } catch (err) {
      console.error('Failed to initialize Web Audio API for visualizer', err)
    }
  }

  const stopVisualization = () => {
    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect()
      } catch (e) {
        console.warn('Error disconnecting audio source', e)
      }
      sourceRef.current = null
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close()
      } catch (e) {
        console.warn('Error closing audio context', e)
      }
      audioContextRef.current = null
    }
    analyserRef.current = null
  }

  useEffect(() => {
    if (isRecording && recordingSeconds >= 180) {
      mediaRecorderRef.current?.stop()
    }
  }, [isRecording, recordingSeconds])

  // Cleanup visualizer context on unmount
  useEffect(() => {
    return () => {
      stopVisualization()
    }
  }, [])

  const getSupportedMimeType = (): string => {
    const types = [
      'audio/mp4',
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
    ]
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type
    }
    return ''
  }

  const handleRecord = async () => {
    if (!isRecording) {
      try {
        setMicError(null)
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mimeType = getSupportedMimeType()
        const mediaRecorder = new MediaRecorder(
          stream,
          mimeType ? { mimeType } : undefined
        )
        mediaRecorderRef.current = mediaRecorder
        audioChunksRef.current = []

        mediaRecorder.ondataavailable = (e) => {
          audioChunksRef.current.push(e.data)
        }

        mediaRecorder.onstop = () => {
          setSavedDuration(recordingSecondsRef.current)
          const effectiveType = mimeType || 'audio/webm'
          const blob = new Blob(audioChunksRef.current, { type: effectiveType })
          onAudioReady(blob, effectiveType)
          stream.getTracks().forEach(t => t.stop())
          stopVisualization()
        }

        // Start Web Audio visualization
        startVisualization(stream)
        mediaRecorder.start()
        onStartRecording()
      } catch (err) {
        stopVisualization()
        const isPermission = err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
        setMicError(
          isPermission
            ? t('onboarding.micPermissionDenied')
            : t('onboarding.micAccessError')
        )
      }
    } else {
      mediaRecorderRef.current?.stop()
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav Bar */}
      <div className="border-b-2 border-ember-3/30 bg-background/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="border-b border-ember-3/15 mb-0.5">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <BrandLogo variant="dark" />
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-3 h-3 rounded-full bg-ember-3"></div>
              <span>{truncatedAddress}</span>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="max-w-4xl mx-auto w-full px-4 py-6">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step === 1 ? 'bg-primary text-primary-foreground' : 'bg-primary/30 text-primary'}`}>
            1
          </div>
          <div className={`h-1 flex-1 ${step === 2 ? 'bg-primary' : 'bg-border'}`}></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step === 2 ? 'bg-primary text-primary-foreground' : 'bg-border text-muted-foreground'}`}>
            2
          </div>
          <span className="font-display text-xs uppercase tracking-[0.25em] text-muted-foreground ml-4">{t('onboarding.stepLabel', { step })}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 pb-8">
        {step === 1 ? (
          <Card className="w-full max-w-lg bg-card border-border p-8 space-y-6">
            <div className="space-y-2">
              <h2 className="font-display text-2xl font-bold">{t('onboarding.title')}</h2>
              <p className="text-muted-foreground">{t('onboarding.subtitle')}</p>
            </div>

            {/* Info Box */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <p className="text-sm text-amber-100">
                {t('onboarding.infoBox')}
              </p>
            </div>

            {/* Language Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('onboarding.selectLanguage')}</label>
              <div className="flex gap-3">
                <button
                  onClick={() => onSelectLanguage('en')}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all border ${
                    selectedLanguage === 'en'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-transparent text-muted-foreground border-border'
                  }`}
                >
                  🇬🇧 English
                </button>
                <button
                  onClick={() => onSelectLanguage('tr')}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all border ${
                    selectedLanguage === 'tr'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-transparent text-muted-foreground border-border'
                  }`}
                >
                  🇹🇷 Türkçe
                </button>
              </div>
            </div>

            {/* Script Box */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">{t('onboarding.readAloud')}</label>
              <div className="bg-black/40 border border-border rounded-lg p-4 max-h-48 overflow-y-auto text-sm font-mono">
                <textarea
                  readOnly
                  value={selectedLanguage === 'tr' ? SCRIPT_TR : SCRIPT_EN}
                  className="w-full bg-transparent text-foreground text-sm font-mono resize-none outline-none"
                  rows={8}
                />
              </div>
            </div>

            {/* Live Waveform Visualizer */}
            {!audioReady && (
              <div className="w-full bg-black/40 border border-border/60 rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden h-24">
                <canvas
                  ref={canvasRef}
                  className="w-full h-full block"
                  width={640}
                  height={160}
                />
                {!isRecording && (
                  <span className="absolute bottom-2 font-display text-[10px] text-muted-foreground tracking-[0.25em] uppercase pointer-events-none">
                    {t('onboarding.visualizerReady')}
                  </span>
                )}
              </div>
            )}

            {/* Recording Button */}
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={handleRecord}
                disabled={audioReady}
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                  audioReady
                    ? 'bg-accent'
                    : isRecording
                    ? 'bg-ember-3 pulse-ring'
                    : 'bg-primary hover:bg-secondary'
                } text-primary-foreground disabled:opacity-75`}
              >
                {audioReady ? (
                  <span className="text-2xl">✓</span>
                ) : isRecording ? (
                  <Mic className="w-8 h-8 text-ember-4" />
                ) : (
                  <Mic className="w-8 h-8" />
                )}
              </button>
              <p className="text-sm text-muted-foreground">
                {audioReady
                  ? t('onboarding.recordingComplete')
                  : isRecording
                  ? `${formatTime(recordingSeconds)} — ${t('onboarding.tapToStop')}`
                  : t('onboarding.tapToStart')}
              </p>
              {isRecording && recordingSeconds < 90 && (
                <p className="text-xs text-amber-400 text-center max-w-xs">
                  {t('onboarding.cloneQualityWarn')}
                </p>
              )}
              {audioReady && savedDuration < 90 && (
                <p className="text-sm text-red-400 text-center max-w-xs">
                  {t('onboarding.minDurationError')}
                </p>
              )}
              {micError && (
                <p className="text-sm text-red-400 text-center max-w-xs">{micError}</p>
              )}
            </div>

            {/* Continue Button */}
            <Button
              onClick={onNextStep}
              disabled={!audioReady || savedDuration < 90}
              className="w-full bg-primary text-primary-foreground hover:bg-secondary disabled:bg-primary/30 disabled:text-primary/50 disabled:cursor-not-allowed"
            >
              {t('onboarding.buttonCreateVoice')} <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </Card>
        ) : (
          <Card className="w-full max-w-lg bg-card border-border p-8 space-y-6">
            <div className="space-y-2">
              <h2 className="font-display text-2xl font-bold">{t('onboarding.priceTitle')}</h2>
              <p className="text-muted-foreground">{t('onboarding.priceSubtitle')}</p>
            </div>

            {/* Price Options */}
            <div className="grid grid-cols-5 gap-2">
              {priceOptions.map((price) => (
                <button
                  key={price}
                  onClick={() => onSelectPrice(price)}
                  className={`p-3 rounded-lg border transition-all ${
                    selectedPrice === price
                      ? 'bg-primary border-primary text-primary-foreground scale-105'
                      : 'border-border bg-background hover:border-primary/50'
                  }`}
                >
                  <div className="font-semibold">{price}</div>
                  <div className="text-xs text-muted-foreground mt-1">{t('onboarding.charsPerUnit')}</div>
                  <div className="text-xs text-muted-foreground">${usdPrices[price]}</div>
                </button>
              ))}
            </div>

            {/* Info Row */}
            <div className="text-center text-sm text-muted-foreground">
              {t('onboarding.mostCreators')}
            </div>

            <WavePath className="my-3 text-ember-3/30" />

            {/* Earnings Preview */}
            <div className="bg-[#1B0506] border border-ember-2/40 rounded-lg p-4 space-y-2">
              <p className="text-sm text-foreground">{t('onboarding.earningsPreview')}</p>
              <div className="space-y-1">
                <p className="font-display text-lg font-bold text-ember-3">
                  {t('onboarding.perRequest')} {(selectedPrice * 2 * 0.9).toFixed(4)} SOL
                </p>
                <p className="font-display text-lg font-bold text-ember-3">
                  {t('onboarding.monthlyEstimate')} {(selectedPrice * 2 * 0.9 * 30 * 10).toFixed(2)} SOL
                </p>
              </div>
              <p className="text-xs text-muted-foreground">{t('onboarding.platformFeeNote')}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                onClick={onBackStep}
                variant="outline"
                className="flex-1 border-border hover:bg-primary/10"
              >
                {t('onboarding.backButton')}
              </Button>
              <Button
                onClick={onLaunch}
                disabled={isRegistering}
                className="flex-1 bg-primary text-primary-foreground hover:bg-secondary disabled:opacity-60"
              >
                {isRegistering ? (
                  <>
                    <RotateCw className="w-4 h-4 mr-2 animate-spin" />
                    {t('onboarding.creatingVoice')}
                  </>
                ) : (
                  t('onboarding.launchButton')
                )}
              </Button>
            </div>
            {registerError && (
              <p className="text-sm text-red-400 text-center">{registerError}</p>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
