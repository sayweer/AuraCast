'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  Pause, 
  Volume2, 
  Calendar, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import type { Purchase } from '@/types';
import { useLanguage } from '@/components/LanguageProvider';
import LanguageToggle from '@/components/LanguageToggle';
import { downloadAudio } from '@/lib/audio-download';

interface PlayScreenProps {
  purchase: Purchase | null;
  creatorName?: string;
}

export default function PlayScreen({ purchase, creatorName }: PlayScreenProps) {
  const { t, language } = useLanguage();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadHint, setDownloadHint] = useState<string | null>(null);

  const audioInstance = useRef<HTMLAudioElement | null>(null);

  const handleDownload = async () => {
    if (!purchase?.audio_url) return;
    setDownloadHint(null);
    const result = await downloadAudio({
      base64: purchase.audio_url,
      filename: `voice-message-${purchase.id.slice(0, 8)}.mp3`,
    });
    if (result === 'opened-new-tab') {
      setDownloadHint(
        language === 'tr'
          ? 'Sesi yeni sekmede açtık. Dosyaya uzun basıp "Ses dosyasını kaydet" deyin.'
          : 'Opened the audio in a new tab. Long-press the file and choose "Save audio".'
      );
    } else if (result === 'failed') {
      setDownloadHint(
        language === 'tr'
          ? 'İndirme başarısız oldu. Ses oynatıcısından doğrudan dinleyebilirsiniz.'
          : 'Download failed. You can still play the audio above.'
      );
    }
  };

  // Convert base64 audio to Blob URL for mobile download compatibility
  useEffect(() => {
    if (purchase && purchase.audio_url) {
      try {
        const byteCharacters = atob(purchase.audio_url);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);

        return () => {
          URL.revokeObjectURL(url);
        };
      } catch (e) {
        console.error('Failed to convert base64 to blob url', e);
        setDownloadUrl(`data:audio/mpeg;base64,${purchase.audio_url}`);
      }
    }
  }, [purchase]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // Canvas waveform visualizer animation
  useEffect(() => {
    if (!purchase) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (isPlaying) {
        phase += 0.1;
        const colors = [
          'rgba(213, 62, 15, 0.7)',   // Ember Orange
          'rgba(155, 15, 6, 0.5)',    // Ember Red
          'rgba(238, 217, 185, 0.30)' // Cream
        ];
        const amplitudes = [22, 12, 28];
        const frequencies = [0.06, 0.04, 0.09];

        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.strokeStyle = colors[i];
          ctx.lineWidth = i === 0 ? 4 : 2;
          ctx.lineCap = 'round';
          
          for (let x = 0; x < canvas.width; x++) {
            const y = canvas.height / 2 + Math.sin(x * frequencies[i] + phase) * amplitudes[i];
            if (x === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.stroke();
        }
      } else {
        // Draw center flat line
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(238, 217, 185, 0.12)';
        ctx.lineWidth = 2.5;
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
      }

      animationFrameId.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isPlaying, purchase]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioInstance.current) {
        audioInstance.current.pause();
      }
    };
  }, []);

  if (!purchase) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-background text-foreground px-4 overflow-hidden">
        {/* Background Neon Blobs */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-ember-2/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] bg-ember-3/8 rounded-full blur-[100px] pointer-events-none" />
        
        <LanguageToggle className="absolute top-6 right-6" />
        <div className="text-center space-y-4 max-w-md relative z-10">
          <h1 className="font-display text-3xl font-extrabold text-rose-500">{t('play.clipNotFound')}</h1>
          <p className="text-muted-foreground text-sm">
            {t('play.clipNotFoundDesc')}
          </p>
          <Link href="/" className="inline-block bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-secondary transition-colors">
            {t('play.backToHome')}
          </Link>
        </div>
      </div>
    );
  }

  const handlePlayToggle = () => {
    if (!purchase.audio_url) return;

    if (!audioInstance.current) {
      const audioSrc = downloadUrl || `data:audio/mpeg;base64,${purchase.audio_url}`;
      const newAudio = new Audio(audioSrc);
      audioInstance.current = newAudio;

      newAudio.addEventListener('loadedmetadata', () => {
        setDuration(newAudio.duration || 0);
      });

      newAudio.addEventListener('timeupdate', () => {
        setCurrentTime(newAudio.currentTime || 0);
        setProgress((newAudio.currentTime / newAudio.duration) * 100);
      });

      newAudio.addEventListener('ended', () => {
        setIsPlaying(false);
        setCurrentTime(0);
        setProgress(0);
      });
    }

    if (isPlaying) {
      audioInstance.current.pause();
      setIsPlaying(false);
    } else {
      audioInstance.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (audioInstance.current) {
      audioInstance.current.currentTime = val;
      setCurrentTime(val);
      setProgress((val / duration) * 100);
    }
  };

  const formatPlayerTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const amountSol = (purchase.amount_lamports / 1e9).toFixed(3);

  const statusLabel = (status: string) => {
    switch (status) {
      case 'completed': return t('play.statusSuccess');
      case 'rejected': return t('play.statusRejectedWithSafety');
      case 'refunded': return t('play.statusRefunded');
      default: return t('play.statusPending');
    }
  };

  const finalCreatorName = creatorName || t('play.creatorDefault');

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-16 overflow-hidden bg-background">
      <LanguageToggle className="absolute top-6 right-6" />

      {/* Background Neon Blobs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        className="max-w-md w-full relative z-10 space-y-6"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        
        {/* Back Link */}
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          {t('play.backToHome')}
        </Link>

        {/* Main Card */}
        <Card className="bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-md border-border/80 p-6 shadow-2xl space-y-6">
          
          {/* Header */}
          <div className="flex items-start justify-between border-b border-border/50 pb-4">
            <div className="space-y-1">
              <h1 className="font-display text-xl font-bold text-foreground">{t('play.voiceClone')}</h1>
              <p className="text-xs text-muted-foreground">
                {t('play.creator')} <strong className="text-foreground">{finalCreatorName}</strong>
              </p>
            </div>
            <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1.5 ${
              purchase.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
              purchase.status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
              purchase.status === 'refunded' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
              'bg-sky-500/10 text-sky-400 border-sky-500/20'
            }`}>
              {purchase.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
              {purchase.status === 'rejected' && <XCircle className="w-3.5 h-3.5" />}
              {purchase.status === 'refunded' && <HelpCircle className="w-3.5 h-3.5" />}
              {purchase.status === 'pending' && <Clock className="w-3.5 h-3.5 animate-pulse" />}
              <span>{statusLabel(purchase.status)}</span>
            </div>
          </div>

          {/* Waveform Visualization area */}
          {purchase.status === 'completed' && purchase.audio_url && (
            <div className="h-28 bg-black/45 rounded-xl border border-border/50 flex items-center justify-center overflow-hidden relative shadow-inner">
              <canvas ref={canvasRef} width={400} height={100} className="w-full h-full" />
              <Volume2 className={`absolute bottom-3 right-3 w-4 h-4 text-muted-foreground/60 ${isPlaying ? 'animate-bounce text-primary' : ''}`} />
            </div>
          )}

          {/* Fan Text Message */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t('play.textSpoken')}</span>
            <p className="italic font-serif text-sm text-foreground/90 pl-3.5 border-l-2 border-primary/30 py-2 bg-black/25 rounded-r-lg leading-relaxed">
              "{purchase.fan_text}"
            </p>
          </div>

          {/* Audio Player Controls */}
          {purchase.status === 'completed' && purchase.audio_url ? (
            <div className="space-y-3">
              <div className="flex items-center gap-4 bg-black/40 px-4 py-3 rounded-lg border border-border/60">
                <button
                  onClick={handlePlayToggle}
                  className="w-10 h-10 flex items-center justify-center bg-primary hover:bg-secondary text-primary-foreground rounded-full transition-all shrink-0 active:scale-95 shadow-md shadow-primary/20"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  )}
                </button>
                <div className="flex-1 flex flex-col space-y-1">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full accent-primary h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground/80 font-mono">
                    <span>{formatPlayerTime(currentTime)}</span>
                    <span>{formatPlayerTime(duration)}</span>
                  </div>
                </div>
              </div>

              {downloadUrl && (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-150 border"
                  style={{
                    background: 'rgba(213,62,15,0.15)',
                    borderColor: 'rgba(213,62,15,0.35)',
                    color: '#EED9B9',
                  }}
                >
                  {t('fan.downloadAudio')}
                </button>
              )}
              {downloadHint && (
                <p className="text-xs text-muted-foreground leading-snug">
                  {downloadHint}
                </p>
              )}
            </div>
          ) : purchase.status === 'rejected' ? (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-500/5 border border-rose-500/20 rounded-lg text-rose-300/90 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div>
                <span className="font-bold block text-rose-400 mb-0.5">{t('play.statusRejectedReason')}</span>
                <span className="italic">{purchase.rejection_reason || t('play.statusRejectedDesc')}</span>
              </div>
            </div>
          ) : purchase.status === 'pending' ? (
            <div className="flex items-center gap-3 p-3.5 bg-sky-500/5 border border-sky-500/10 rounded-lg text-sky-300 text-xs">
              <Clock className="w-4 h-4 text-sky-400 animate-pulse shrink-0" />
              <span>{t('play.statusPendingDesc')}</span>
            </div>
          ) : null}

          {/* Details footer */}
          <div className="flex justify-between text-[10px] text-muted-foreground border-t border-border/40 pt-4 px-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(purchase.created_at).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            <span>{t('play.paid')} <strong>{amountSol} SOL</strong></span>
          </div>

        </Card>

        {/* CTA Card */}
        <Card className="bg-card/40 border border-border/60 p-5 text-center space-y-3.5">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t('play.ctaDesc')}
          </p>
          <Link href="/" className="inline-block w-full bg-primary hover:bg-secondary text-primary-foreground text-xs font-semibold py-2.5 rounded-lg transition-colors">
            {t('play.ctaButton')}
          </Link>
        </Card>

      </motion.div>
    </div>
  );
}
