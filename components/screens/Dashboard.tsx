'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Copy,
  Check,
  Settings,
  TrendingUp,
  Play,
  Pause,
  Search,
  RefreshCw,
  Music,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  Volume2,
  Loader2,
  HelpCircle
} from 'lucide-react';
import type { RecentPurchaseRow } from '@/types';
import { useLanguage } from '@/components/LanguageProvider';
import LanguageToggle from '@/components/LanguageToggle';

const Analytics = dynamic(() => import('@/components/screens/Analytics'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
      Loading analytics…
    </div>
  ),
})

type DashboardTab = 'overview' | 'analytics' | 'messages'

interface DashboardProps {
  walletAddress: string;
  creatorStats: {
    totalEarned: number
    totalMessages: number
    priceInLamports: number
    voiceId: string
  } | null;
  priceInSol: string;
  copiedLink: boolean;
  onOpenSettings: () => void;
  onCopyLink: () => void;
  getAuthHeaders: (walletAddr: string, forceRefresh?: boolean) => Promise<Record<string, string>>;
}

export default function Dashboard({
  walletAddress,
  creatorStats,
  priceInSol,
  copiedLink,
  onOpenSettings,
  onCopyLink,
  getAuthHeaders,
}: DashboardProps) {
  const { t, language } = useLanguage();
  const [tab, setTab] = useState<DashboardTab>('overview');
  const [purchases, setPurchases] = useState<RecentPurchaseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Audio Player State
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Track listeners attached to the current audio element so we can detach them
  // before swapping in a new one — otherwise each replayed message leaks 3
  // listener references + the underlying Audio object.
  const audioListenersRef = useRef<{
    loadedmetadata: () => void
    timeupdate: () => void
    ended: () => void
  } | null>(null);

  const detachAudioListeners = () => {
    const audio = audioRef.current;
    const listeners = audioListenersRef.current;
    if (!audio || !listeners) return;
    audio.removeEventListener('loadedmetadata', listeners.loadedmetadata);
    audio.removeEventListener('timeupdate', listeners.timeupdate);
    audio.removeEventListener('ended', listeners.ended);
    audioListenersRef.current = null;
  };

  const fetchPurchases = useCallback(async (retry = true) => {
    if (!walletAddress) return;
    setLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeaders(walletAddress);
      const res = await fetch(`/api/creator/analytics/${walletAddress}?days=30`, {
        headers,
        cache: 'no-store'
      });
      if (res.status === 401 && retry) {
        sessionStorage.removeItem(`auracast_session_${walletAddress}`);
        await fetchPurchases(false);
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? (language === 'tr' ? `Mesajlar yüklenemedi (HTTP ${res.status})` : `Failed to load messages (HTTP ${res.status})`));
      }
      const json = await res.json();
      setPurchases(json.recent ?? []);
    } catch (err: any) {
      console.error('[Dashboard] Error fetching purchases:', err);
      setError(err.message || t('dashboard.errorLoading'));
    } finally {
      setLoading(false);
    }
  }, [walletAddress, getAuthHeaders, language, t]);

  useEffect(() => {
    if (tab === 'messages' && walletAddress) {
      fetchPurchases();
    }
  }, [tab, walletAddress, fetchPurchases]);

  useEffect(() => {
    return () => {
      detachAudioListeners();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playAudio = (purchaseId: string, base64Audio: string) => {
    if (playingId === purchaseId) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play().catch(console.error);
        setIsPlaying(true);
      }
      return;
    }

    // Tear down previous audio + its listeners before creating a new one
    detachAudioListeners();
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;
    const newAudio = new Audio(audioUrl);
    audioRef.current = newAudio;
    setPlayingId(purchaseId);
    setIsPlaying(true);
    setCurrentTime(0);
    setDuration(0);

    const onLoadedMetadata = () => {
      setDuration(newAudio.duration || 0);
    };
    const onTimeUpdate = () => {
      setCurrentTime(newAudio.currentTime || 0);
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      setPlayingId(null);
    };

    newAudio.addEventListener('loadedmetadata', onLoadedMetadata);
    newAudio.addEventListener('timeupdate', onTimeUpdate);
    newAudio.addEventListener('ended', onEnded);
    audioListenersRef.current = {
      loadedmetadata: onLoadedMetadata,
      timeupdate: onTimeUpdate,
      ended: onEnded,
    };

    newAudio.play().catch((e) => {
      console.error('Playback failed', e);
      setIsPlaying(false);
      setPlayingId(null);
    });
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const filteredPurchases = purchases.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      const matchWallet = p.buyer_wallet.toLowerCase().includes(term);
      const matchText = p.fan_text?.toLowerCase().includes(term) ?? false;
      return matchWallet || matchText;
    }
    return true;
  });

  const truncatedAddress = walletAddress.substring(0, 6) + '...' + walletAddress.substring(walletAddress.length - 6);
  const fanPageUrl = walletAddress
    ? `https://auracast-murex.vercel.app/fan/${walletAddress}`
    : ''
  const shareText = encodeURIComponent(
    t('dashboard.shareTweetText') +
    `${fanPageUrl}\n\n#AuraCast #AI`
  )
  const xShareUrl = fanPageUrl
    ? `https://x.com/intent/post?text=${shareText}`
    : '#'

  return (
    <div className="min-h-screen pb-12">
      {/* Nav Bar */}
      <div className="border-b border-border bg-background/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary">🎙 AuraCast</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-3 h-3 rounded-full bg-accent"></div>
              <span>{truncatedAddress}</span>
            </div>
            <LanguageToggle />
            <button
              onClick={onOpenSettings}
              className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5 text-primary" />
            </button>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="border-b border-border bg-background/30">
        <div className="max-w-6xl mx-auto px-4 flex gap-6">
          <TabButton active={tab === 'overview'} onClick={() => setTab('overview')}>
            {t('dashboard.overviewTab')}
          </TabButton>
          <TabButton active={tab === 'analytics'} onClick={() => setTab('analytics')}>
            {t('dashboard.analyticsTab')}
          </TabButton>
          <TabButton active={tab === 'messages'} onClick={() => setTab('messages')}>
            {t('dashboard.messagesTab')}
          </TabButton>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {tab === 'analytics' && (
          <Analytics walletAddress={walletAddress} getAuthHeaders={getAuthHeaders} />
        )}

        {tab === 'overview' && (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Total Earned */}
              <Card className="bg-card border-border p-6 space-y-4 md:col-span-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm mb-2">{t('dashboard.totalEarned')}</p>
                    <h3 className="text-4xl font-bold">
                      {((creatorStats?.totalEarned ?? 0) / 1e9).toFixed(2)} SOL
                    </h3>
                    <p className="text-muted-foreground text-sm mt-1">
                      ≈ ${(((creatorStats?.totalEarned ?? 0) / 1e9) * 150).toFixed(0)} USD
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-primary" />
                </div>
              </Card>

              {/* Messages Generated */}
              <Card className="bg-card border-border p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm mb-2">{t('dashboard.messagesGenerated')}</p>
                    <h3 className="text-4xl font-bold">{creatorStats?.totalMessages ?? 0}</h3>
                    <p className="text-muted-foreground text-sm mt-1">{t('dashboard.allTimeRequests')}</p>
                  </div>
                </div>
              </Card>

              {/* Price Per 150 Chars */}
              <Card className="bg-card border-border p-6 space-y-2 md:col-span-3 lg:col-span-1">
                <p className="text-muted-foreground text-sm">{t('dashboard.pricePer150')}</p>
                <h3 className="text-4xl font-bold">{priceInSol} SOL</h3>
                <p className="text-muted-foreground text-sm mt-1">{t('dashboard.currentRate')}</p>
              </Card>
            </div>

            {/* Fan Page URL Card */}
            <Card className="bg-card border-border p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{t('dashboard.fanPageLink')}</span>
                </div>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  value={fanPageUrl}
                  readOnly
                  placeholder={language === 'tr' ? 'Cüzdanınızı bağlayarak fan sayfası linkinizi alın' : 'Connect wallet to get your fan page link'}
                  className="w-full bg-black/40 border border-border rounded-lg px-4 py-2.5 text-sm font-mono text-muted-foreground focus:outline-none"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => {
                      if (!fanPageUrl) return
                      navigator.clipboard.writeText(fanPageUrl)
                      onCopyLink()
                    }}
                    size="sm"
                    className="bg-primary hover:bg-secondary text-primary-foreground font-semibold flex items-center gap-1.5"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-4 h-4" /> {t('dashboard.copied')}
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" /> {t('dashboard.copyLink')}
                      </>
                    )}
                  </Button>

                  <a
                    href={xShareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition-colors border border-white/10"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    {t('dashboard.share')}
                  </a>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                {t('dashboard.shareTextDesc')}
              </p>
            </Card>
          </>
        )}

        {tab === 'messages' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                  <Music className="w-6 h-6 text-primary" />
                  {t('dashboard.receivedMessages')}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('dashboard.receivedDesc')}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchPurchases()}
                disabled={loading}
                className="flex items-center gap-2 border-border bg-card/40 text-foreground hover:bg-white/10 transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {t('dashboard.refresh')}
              </Button>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card/30 backdrop-blur-md p-4 rounded-xl border border-border/80 shadow-inner">
              {/* Filter Tabs */}
              <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-none">
                <FilterButton active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
                  {t('dashboard.all')}
                </FilterButton>
                <FilterButton active={statusFilter === 'completed'} onClick={() => setStatusFilter('completed')}>
                  {t('dashboard.completed')}
                </FilterButton>
                <FilterButton active={statusFilter === 'pending'} onClick={() => setStatusFilter('pending')}>
                  {t('dashboard.pending')}
                </FilterButton>
                <FilterButton active={statusFilter === 'rejected'} onClick={() => setStatusFilter('rejected')}>
                  {t('dashboard.rejected')}
                </FilterButton>
              </div>

              {/* Search Input */}
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t('dashboard.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-black/40 border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            </div>

            {/* Messages Container */}
            {loading && purchases.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-sm font-medium">{t('dashboard.loadingMessages')}</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16 text-rose-400 space-y-4 border border-rose-500/25 bg-rose-500/5 rounded-xl backdrop-blur-sm">
                <AlertCircle className="w-10 h-10" />
                <p className="text-sm font-medium">{error}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-rose-500/30 hover:bg-rose-500/10 text-rose-300"
                  onClick={() => fetchPurchases()}
                >
                  {t('dashboard.retry')}
                </Button>
              </div>
            ) : filteredPurchases.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border border-border/80 border-dashed rounded-xl bg-card/10 space-y-3">
                <Music className="w-10 h-10 opacity-30 text-primary" />
                <p className="text-sm font-semibold text-foreground/80">{t('dashboard.notFound')}</p>
                <p className="text-xs max-w-md text-center px-4">
                  {purchases.length === 0
                    ? t('dashboard.emptyDesc')
                    : t('dashboard.noMatchDesc')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPurchases.map((p) => (
                  <MessageCard
                    key={p.id}
                    purchase={p}
                    isPlaying={playingId === p.id && isPlaying}
                    currentTime={playingId === p.id ? currentTime : 0}
                    duration={playingId === p.id ? duration : 0}
                    onPlay={() => p.audio_url && playAudio(p.id, p.audio_url)}
                    onSeek={handleSeek}
                  />
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={
        'relative py-3 text-sm font-medium transition-colors ' +
        (active
          ? 'text-foreground'
          : 'text-muted-foreground hover:text-foreground')
      }
    >
      {children}
      {active && (
        <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary rounded-full" />
      )}
    </button>
  )
}

function formatDate(iso: string, lang: string): string {
  const d = new Date(iso)
  return d.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusIcon(status: string) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="w-4 h-4 text-emerald-400" />
    case 'rejected':
      return <XCircle className="w-4 h-4 text-rose-400" />
    case 'refunded':
      return <HelpCircle className="w-4 h-4 text-amber-400" />
    default:
      return <Clock className="w-4 h-4 text-sky-400 animate-pulse" />
  }
}

function statusLabel(status: string, t: any) {
  switch (status) {
    case 'completed': return t('messageCard.statusCompleted')
    case 'rejected': return t('messageCard.statusRejected')
    case 'refunded': return t('messageCard.statusRefunded')
    default: return t('messageCard.statusPending')
  }
}

function statusClass(status: string) {
  switch (status) {
    case 'completed':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    case 'rejected':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    case 'refunded':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    default:
      return 'bg-sky-500/10 text-sky-400 border-sky-500/20'
  }
}

function formatPlayerTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={
        'px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap ' +
        (active
          ? 'bg-primary border-primary text-primary-foreground shadow-md shadow-primary/20 scale-105'
          : 'bg-black/25 border-border text-muted-foreground hover:text-foreground hover:bg-white/5')
      }
    >
      {children}
    </button>
  )
}

interface MessageCardProps {
  purchase: RecentPurchaseRow
  isPlaying: boolean
  currentTime: number
  duration: number
  onPlay: () => void
  onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void
}

function MessageCard({
  purchase,
  isPlaying,
  currentTime,
  duration,
  onPlay,
  onSeek,
}: MessageCardProps) {
  const { t, language } = useLanguage()
  const buyerTruncated = purchase.buyer_wallet.slice(0, 6) + '...' + purchase.buyer_wallet.slice(-6)
  const amountSol = (purchase.amount_lamports / 1e9).toFixed(3)

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-md border-border/80 hover:border-primary/30 transition-all duration-300 shadow-md p-5 flex flex-col justify-between space-y-4">
      {/* Top Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs font-mono text-muted-foreground tracking-tight select-all">
            {t('messageCard.buyer')} {buyerTruncated}
          </span>
          <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1 mt-0.5">
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(purchase.created_at, language)}
          </span>
        </div>
        <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusClass(purchase.status)}`}>
          {statusIcon(purchase.status)}
          <span>{statusLabel(purchase.status, t)}</span>
        </div>
      </div>

      {/* Message content */}
      <div className="flex-1">
        <p className="italic font-serif text-sm text-foreground/90 pl-3 border-l-2 border-primary/30 py-1.5 bg-black/20 rounded-r-lg pr-3 leading-relaxed">
          "{purchase.fan_text || (language === 'tr' ? 'Metin yok' : 'No text')}"
        </p>
      </div>

      {/* Bottom Action Footer Row */}
      <div className="border-t border-border/40 pt-3 flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            {t('messageCard.amount')} <strong className="text-foreground">{amountSol} SOL</strong>
          </span>
          {purchase.play_count > 0 && (
            <span className="text-[10px] text-muted-foreground/80 flex items-center gap-1">
              <Volume2 className="w-3.5 h-3.5 text-primary" />
              {t('dashboard.timesPlayed', { count: purchase.play_count })}
            </span>
          )}
        </div>

        {/* Audio Player Row or Status Notification */}
        {purchase.status === 'completed' && purchase.audio_url ? (
          <div className="flex items-center gap-3 bg-black/35 px-3 py-2 rounded-lg border border-border/50">
            {/* Play/Pause Button */}
            <button
              onClick={onPlay}
              className="w-8 h-8 flex items-center justify-center bg-primary hover:bg-secondary text-primary-foreground rounded-full transition-all shrink-0 active:scale-95 shadow-md shadow-primary/10"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            {/* Progress Slider */}
            <div className="flex-1 flex flex-col space-y-1">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={onSeek}
                className="w-full accent-primary h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-muted-foreground/80 font-mono">
                <span>{formatPlayerTime(currentTime)}</span>
                <span>{formatPlayerTime(duration)}</span>
              </div>
            </div>
          </div>
        ) : purchase.status === 'rejected' ? (
          <div className="flex items-start gap-2 bg-rose-500/5 border border-rose-500/20 px-3 py-2 rounded-lg text-rose-300/90 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block text-rose-400">{t('messageCard.moderationBlocked')}</span>
              <span className="italic">{purchase.rejection_reason || (language === 'tr' ? 'Güvenlik filtrelerine takıldı.' : 'Blocked by safety filters.')}</span>
            </div>
          </div>
        ) : purchase.status === 'pending' ? (
          <div className="flex items-center gap-2 bg-sky-500/5 border border-sky-500/10 px-3 py-2 rounded-lg text-sky-300 text-xs">
            <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin text-sky-400" />
            <span>{t('messageCard.generatingVoiceDesc')}</span>
          </div>
        ) : purchase.status === 'refunded' ? (
          <div className="flex items-center gap-2 bg-amber-500/5 border border-amber-500/10 px-3 py-2 rounded-lg text-amber-300 text-xs">
            <HelpCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{t('messageCard.refundedDesc')}</span>
          </div>
        ) : null}
      </div>
    </Card>
  )
}

