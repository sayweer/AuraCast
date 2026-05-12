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
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

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
    } else if (recordingSeconds >= 30) {
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
              <p className="text-muted-foreground">Record yourself speaking clearly for 1–2 minutes</p>
            </div>

            {/* Info Box */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <p className="text-sm text-amber-100">
                💡 1–2 minutes of clear audio gives the best results. Avoid recording more than 3 minutes.
              </p>
            </div>

            {/* Script Box */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Read this text aloud:</label>
              <div className="bg-black/40 border border-border rounded-lg p-4 max-h-32 overflow-y-auto text-sm font-mono">
                <p className="text-foreground">
                  Welcome to AuraCast. My name is [your name], and this is my official voice registration. I&apos;m recording this message to create my unique voice identity on the Solana blockchain. AuraCast uses advanced AI to license my voice securely, ensuring fans can receive personalized messages while my brand stays protected at all times. Every request passes through an AI safety filter before any audio is generated. This platform gives me complete control over how my voice is used, and I can pause or revoke access at any time.
                </p>
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
              📊 Most creators choose 1.5–2 SOL per message
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
