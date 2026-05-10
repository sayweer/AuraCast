'use client';

import { useState, useEffect } from 'react';
import Landing from '@/components/screens/Landing';
import Onboarding from '@/components/screens/Onboarding';
import Dashboard from '@/components/screens/Dashboard';
import SettingsModal from '@/components/SettingsModal';
import { useWallet } from '@solana/wallet-adapter-react'

export default function App() {
  const { publicKey, disconnect, connected } = useWallet()
  const walletAddress = publicKey?.toBase58() ?? ''

  const [appState, setAppState] = useState<'landing' | 'onboarding' | 'dashboard'>('landing');
  const [onboardingStep, setOnboardingStep] = useState<1 | 2>(1);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioReady, setAudioReady] = useState(false);
  const [selectedPrice, setSelectedPrice] = useState(0.05);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copiedBlink, setCopiedBlink] = useState(false);
  const [isCheckingDB, setIsCheckingDB] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [registerError, setRegisterError] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [creatorStats, setCreatorStats] = useState<{
    totalEarned: number
    totalMessages: number
    priceInLamports: number
    voiceId: string
  } | null>(null)

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    if (!connected || !publicKey || appState !== 'landing') return

    const checkCreator = async () => {
      setIsCheckingDB(true)
      try {
        const res = await fetch(`/api/creator/${publicKey.toBase58()}`)
        if (res.ok) {
          setAppState('dashboard')
        } else {
          setAppState('onboarding')
          setOnboardingStep(1)
        }
      } catch {
        setAppState('onboarding')
        setOnboardingStep(1)
      } finally {
        setIsCheckingDB(false)
      }
    }

    checkCreator()
  }, [connected, publicKey])

  useEffect(() => {
    if (appState !== 'dashboard' || !publicKey) return

    const fetchStats = async () => {
      const res = await fetch(`/api/creator/${publicKey.toBase58()}`)
      if (res.ok) {
        const creator = await res.json()
        setCreatorStats({
          totalEarned: creator.total_earned,
          totalMessages: creator.total_messages,
          priceInLamports: creator.price_lamports,
          voiceId: creator.voice_id,
        })
      }
    }

    fetchStats()
  }, [appState, publicKey])

  const handleDisconnectWallet = async () => {
    await disconnect()
    setAppState('landing')
    setOnboardingStep(1)
    setAudioReady(false)
    setRecordingSeconds(0)
    setIsRecording(false)
    setAudioBlob(null)
    setRegisterError(null)
    setCreatorStats(null)
  }

  const handleStartRecording = () => {
    setIsRecording(true)
    setRecordingSeconds(0)
  }

  const handleAudioReady = (blob: Blob) => {
    setAudioBlob(blob)
    setAudioReady(true)
    setIsRecording(false)
  }

  const handleLaunch = async () => {
    if (!publicKey || !audioBlob) return
    setIsRegistering(true)
    setRegisterError(null)

    try {
      const arrayBuffer = await audioBlob.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString('base64')

      const res = await fetch('/api/creator/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          creatorName: publicKey.toBase58().slice(0, 8),
          audioBase64: base64,
          fileName: 'voice.webm',
          priceInLamports: Math.round(selectedPrice * 1_000_000_000),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 409) {
          setAppState('dashboard')
          return
        }
        setRegisterError(data.error ?? 'Registration failed')
        return
      }

      setAppState('dashboard')
    } catch {
      setRegisterError('Network error. Please try again.')
    } finally {
      setIsRegistering(false)
    }
  }

  const handleCopyBlink = () => {
    setCopiedBlink(true);
    setTimeout(() => setCopiedBlink(false), 2000);
  };

  if (isCheckingDB) {
    return (
      <div className="app-container min-h-screen w-full bg-background text-foreground flex flex-col items-center justify-center gap-3">
        <div className="text-lg font-semibold">🎙 Checking your voice profile...</div>
        <div className="text-sm text-muted-foreground">Connecting to Solana...</div>
      </div>
    )
  }

  return (
    <div className="app-container min-h-screen w-full bg-background text-foreground">
      {appState === 'landing' && (
        <Landing />
      )}

      {appState === 'onboarding' && (
        <Onboarding
          step={onboardingStep}
          isRecording={isRecording}
          recordingSeconds={recordingSeconds}
          audioReady={audioReady}
          selectedPrice={selectedPrice}
          walletAddress={walletAddress}
          onStartRecording={handleStartRecording}
          onNextStep={() => setOnboardingStep(2)}
          onBackStep={() => setOnboardingStep(1)}
          onSelectPrice={setSelectedPrice}
          onAudioReady={handleAudioReady}
          onLaunch={handleLaunch}
          isRegistering={isRegistering}
          registerError={registerError}
        />
      )}

      {appState === 'dashboard' && (
        <Dashboard
          walletAddress={walletAddress}
          selectedPrice={selectedPrice}
          creatorStats={creatorStats}
          copiedBlink={copiedBlink}
          settingsOpen={settingsOpen}
          onOpenSettings={() => setSettingsOpen(true)}
          onCloseSettings={() => setSettingsOpen(false)}
          onCopyBlink={handleCopyBlink}
          onDisconnect={handleDisconnectWallet}
          onRerecord={() => {
            setAppState('onboarding');
            setOnboardingStep(1);
            setAudioReady(false);
            setRecordingSeconds(0);
            setIsRecording(false);
            setAudioBlob(null);
            setRegisterError(null);
            setCreatorStats(null);
          }}
        />
      )}

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        walletAddress={walletAddress}
        selectedPrice={selectedPrice}
        onDisconnect={handleDisconnectWallet}
        onRerecord={() => {
          setAppState('onboarding');
          setOnboardingStep(1);
          setAudioReady(false);
          setRecordingSeconds(0);
          setIsRecording(false);
          setAudioBlob(null);
          setRegisterError(null);
          setCreatorStats(null);
          setSettingsOpen(false);
        }}
        onPriceUpdate={(newPrice) => {
          setSelectedPrice(newPrice);
        }}
        onPriceUpdateSuccess={(newLamports) => {
          setCreatorStats(prev => prev ? { ...prev, priceInLamports: newLamports } : null);
        }}
      />
    </div>
  );
}
