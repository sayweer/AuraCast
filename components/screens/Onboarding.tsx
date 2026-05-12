'use client';

import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, ChevronRight, RotateCw } from 'lucide-react';

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
  const truncatedAddress = walletAddress.substring(0, 6) + '...' + walletAddress.substring(walletAddress.length - 6);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  useEffect(() => {
    if (isRecording && recordingSeconds >= 180) {
      mediaRecorderRef.current?.stop()
    }
  }, [isRecording, recordingSeconds])

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
          const effectiveType = mimeType || 'audio/webm'
          const blob = new Blob(audioChunksRef.current, { type: effectiveType })
          onAudioReady(blob, effectiveType)
          stream.getTracks().forEach(t => t.stop())
        }

        mediaRecorder.start()
        onStartRecording()
      } catch {
        // mic permission denied
      }
    } else if (recordingSeconds >= 90) {
      mediaRecorderRef.current?.stop()
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav Bar */}
      <div className="border-b border-border bg-background/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary">🎙 AuraCast</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-3 h-3 rounded-full bg-accent"></div>
            <span>{truncatedAddress}</span>
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
          <span className="text-sm text-muted-foreground ml-4">Step {step} of 2</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 pb-8">
        {step === 1 ? (
          <Card className="w-full max-w-lg bg-card border-border p-8 space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Create Your Voice Identity</h2>
              <p className="text-muted-foreground">Read the full script aloud — at least 90 seconds</p>
            </div>

            {/* Info Box */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <p className="text-sm text-amber-100">
                💡 Read the entire script for the best voice clone quality. Minimum 90 seconds required.
              </p>
            </div>

            {/* Language Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Select your language</label>
              <div className="flex gap-3">
                <button
                  onClick={() => onSelectLanguage('en')}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all border ${
                    selectedLanguage === 'en'
                      ? 'bg-primary text-white border-primary'
                      : 'bg-transparent text-muted-foreground border-border'
                  }`}
                >
                  🇬🇧 English
                </button>
                <button
                  onClick={() => onSelectLanguage('tr')}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all border ${
                    selectedLanguage === 'tr'
                      ? 'bg-primary text-white border-primary'
                      : 'bg-transparent text-muted-foreground border-border'
                  }`}
                >
                  🇹🇷 Türkçe
                </button>
              </div>
            </div>

            {/* Script Box */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Read this text aloud:</label>
              <div className="bg-black/40 border border-border rounded-lg p-4 max-h-48 overflow-y-auto text-sm font-mono">
                <textarea
                  readOnly
                  value={selectedLanguage === 'tr' ? SCRIPT_TR : SCRIPT_EN}
                  className="w-full bg-transparent text-foreground text-sm font-mono resize-none outline-none"
                  rows={8}
                />
              </div>
            </div>

            {/* Recording Button */}
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={handleRecord}
                disabled={audioReady}
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                  audioReady
                    ? 'bg-accent'
                    : isRecording
                    ? 'bg-red-600 pulse-ring'
                    : 'bg-primary hover:bg-secondary'
                } text-white disabled:opacity-75`}
              >
                {audioReady ? (
                  <span className="text-2xl">✓</span>
                ) : isRecording ? (
                  <Mic className="w-8 h-8 text-red-400" />
                ) : (
                  <Mic className="w-8 h-8" />
                )}
              </button>
              <p className="text-sm text-muted-foreground">
                {audioReady
                  ? 'Recording Complete ✓'
                  : isRecording
                  ? formatTime(recordingSeconds)
                  : 'Tap to Start Recording'}
              </p>
            </div>

            {/* Continue Button */}
            <Button
              onClick={onNextStep}
              disabled={!audioReady}
              className="w-full bg-primary text-primary-foreground hover:bg-secondary disabled:bg-primary/30 disabled:text-primary/50 disabled:cursor-not-allowed"
            >
              Create My Voice Clone <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </Card>
        ) : (
          <Card className="w-full max-w-lg bg-card border-border p-8 space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Set Your Voice Price</h2>
              <p className="text-muted-foreground">How much SOL per 150 characters?</p>
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
                  <div className="text-xs text-muted-foreground mt-1">SOL / 150 chars</div>
                  <div className="text-xs text-muted-foreground">${usdPrices[price]}</div>
                </button>
              ))}
            </div>

            {/* Info Row */}
            <div className="text-center text-sm text-muted-foreground">
              📊 Most creators choose 0.03–0.05 SOL per 150 characters
            </div>

            {/* Earnings Preview */}
            <div className="bg-[#200010] border border-[#C41E3A]/40 rounded-lg p-4 space-y-2">
              <p className="text-sm text-[#F5F0F1]">If a fan sends 300 characters (2 units):</p>
              <div className="space-y-1">
                <p className="text-lg font-bold text-[#FF6B84]">
                  Per request: {(selectedPrice * 2 * 0.9).toFixed(4)} SOL
                </p>
                <p className="text-lg font-bold text-[#FF6B84]">
                  Monthly (10 req/day): {(selectedPrice * 2 * 0.9 * 30 * 10).toFixed(2)} SOL
                </p>
              </div>
              <p className="text-xs text-muted-foreground">(after 10% platform fee)</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                onClick={onBackStep}
                variant="outline"
                className="flex-1 border-border hover:bg-primary/10"
              >
                ← Back
              </Button>
              <Button
                onClick={onLaunch}
                disabled={isRegistering}
                className="flex-1 bg-primary text-primary-foreground hover:bg-secondary disabled:opacity-60"
              >
                {isRegistering ? (
                  <>
                    <RotateCw className="w-4 h-4 mr-2 animate-spin" />
                    Creating your voice clone...
                  </>
                ) : (
                  'Launch My Voice 🚀'
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
