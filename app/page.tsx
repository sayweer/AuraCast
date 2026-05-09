'use client';

import { useState, useEffect } from 'react';
import Landing from '@/components/screens/Landing';
import Onboarding from '@/components/screens/Onboarding';
import Dashboard from '@/components/screens/Dashboard';
import SettingsModal from '@/components/SettingsModal';

export default function App() {
  const [appState, setAppState] = useState<'landing' | 'onboarding' | 'dashboard'>('landing');
  const [onboardingStep, setOnboardingStep] = useState<1 | 2>(1);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioReady, setAudioReady] = useState(false);
  const [selectedPrice, setSelectedPrice] = useState(1.5);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copiedBlink, setCopiedBlink] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleConnectWallet = () => {
    setWalletAddress('6vUTX...KDsb');
    setWalletConnected(true);
    setAppState('onboarding');
    setOnboardingStep(1);
  };

  const handleDisconnectWallet = () => {
    setAppState('landing');
    setWalletConnected(false);
    setWalletAddress('');
    setOnboardingStep(1);
    setAudioReady(false);
    setRecordingSeconds(0);
    setIsRecording(false);
  };

  const handleStartRecording = () => {
    if (!isRecording) {
      setIsRecording(true);
      setRecordingSeconds(0);
    } else if (recordingSeconds >= 30) {
      setIsRecording(false);
      setAudioReady(true);
    }
  };

  const handleCopyBlink = () => {
    setCopiedBlink(true);
    setTimeout(() => setCopiedBlink(false), 2000);
  };

  return (
    <div className="app-container min-h-screen w-full bg-background text-foreground">
      {appState === 'landing' && (
        <Landing onConnect={handleConnectWallet} />
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
          onLaunch={() => setAppState('dashboard')}
        />
      )}

      {appState === 'dashboard' && (
        <Dashboard
          walletAddress={walletAddress}
          selectedPrice={selectedPrice}
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
          setSettingsOpen(false);
        }}
        onPriceUpdate={(newPrice) => {
          setSelectedPrice(newPrice);
        }}
      />
    </div>
  );
}
