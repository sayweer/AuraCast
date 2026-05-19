'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Copy, Check, Settings, TrendingUp } from 'lucide-react';

const Analytics = dynamic(() => import('@/components/screens/Analytics'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
      Loading analytics…
    </div>
  ),
})

type DashboardTab = 'overview' | 'analytics'

interface DashboardProps {
  walletAddress: string;
  creatorStats: {
    totalEarned: number
    totalMessages: number
    priceInLamports: number
    voiceId: string
  } | null;
  priceInSol: string;
  copiedBlink: boolean;
  onOpenSettings: () => void;
  onCopyBlink: () => void;
  getSignature: () => Promise<string>;
}

export default function Dashboard({
  walletAddress,
  creatorStats,
  priceInSol,
  copiedBlink,
  onOpenSettings,
  onCopyBlink,
  getSignature,
}: DashboardProps) {
  const [tab, setTab] = useState<DashboardTab>('overview');
  const truncatedAddress = walletAddress.substring(0, 6) + '...' + walletAddress.substring(walletAddress.length - 6);
  const fanPageUrl = walletAddress
    ? `https://auracast-murex.vercel.app/fan/${walletAddress}`
    : ''
  const shareText = encodeURIComponent(
    `🎙 Send me a personalized voice message on AuraCast!\n\n` +
    `${fanPageUrl}\n\n#AuraCast #Solana #AI`
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
            Overview
          </TabButton>
          <TabButton active={tab === 'analytics'} onClick={() => setTab('analytics')}>
            Analytics
          </TabButton>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {tab === 'analytics' && (
          <Analytics walletAddress={walletAddress} getSignature={getSignature} />
        )}

        {tab === 'overview' && (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Total Earned */}
              <Card className="bg-card border-border p-6 space-y-4 md:col-span-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm mb-2">Total Earned</p>
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
                    <p className="text-muted-foreground text-sm mb-2">Messages Generated</p>
                    <h3 className="text-4xl font-bold">{creatorStats?.totalMessages ?? 0}</h3>
                    <p className="text-muted-foreground text-sm mt-1">All time requests</p>
                  </div>
                </div>
              </Card>

              {/* Price Per 150 Chars */}
              <Card className="bg-card border-border p-6 space-y-2 md:col-span-3 lg:col-span-1">
                <p className="text-muted-foreground text-sm">Price Per 150 Chars</p>
                <h3 className="text-4xl font-bold">{priceInSol} SOL</h3>
                <p className="text-muted-foreground text-sm mt-1">Your current rate</p>
              </Card>
            </div>

            {/* Fan Page URL Card */}
            <Card className="bg-card border-border p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">🔗 Your Fan Page Link</span>
                </div>
              </div>

              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={fanPageUrl}
                  readOnly
                  placeholder="Connect wallet to get your fan page link"
                  className="flex-1 bg-black/40 border border-border rounded-lg px-4 py-2 text-sm font-mono text-muted-foreground"
                />
                <Button
                  onClick={() => {
                    if (!fanPageUrl) return
                    navigator.clipboard.writeText(fanPageUrl)
                    onCopyBlink()
                  }}
                  size="sm"
                  className="bg-primary hover:bg-secondary text-primary-foreground"
                >
                  {copiedBlink ? (
                    <>
                      <Check className="w-4 h-4" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> Copy
                    </>
                  )}
                </Button>
                <a
                  href={xShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
                >
                  🐦 Share on X
                </a>
              </div>

              <p className="text-sm text-muted-foreground">
                Share this link anywhere — fans click it, type a message, pay SOL, and instantly hear it in your voice.
              </p>
            </Card>
          </>
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
