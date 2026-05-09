'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Copy, Check, Settings, ExternalLink, TrendingUp, CheckCircle2, RotateCw } from 'lucide-react';

interface DashboardProps {
  walletAddress: string;
  selectedPrice: number;
  creatorStats: {
    totalEarned: number
    totalMessages: number
    priceInLamports: number
    voiceId: string
  } | null;
  copiedBlink: boolean;
  settingsOpen: boolean;
  onOpenSettings: () => void;
  onCloseSettings: () => void;
  onCopyBlink: () => void;
  onDisconnect: () => void;
  onRerecord: () => void;
}

export default function Dashboard({
  walletAddress,
  selectedPrice,
  creatorStats,
  copiedBlink,
  onOpenSettings,
  onCopyBlink,
}: DashboardProps) {
  const truncatedAddress = walletAddress.substring(0, 6) + '...' + walletAddress.substring(walletAddress.length - 6);
  const blinkUrl = walletAddress
    ? `https://dial.to/?action=solana-action:https://auracast-murex.vercel.app/api/actions/voice/${walletAddress}`
    : ''
  const truncatedBlinkUrl = blinkUrl.length > 50 ? blinkUrl.substring(0, 50) + '...' : blinkUrl

  const sampleRequests = [
    { time: '2m ago', preview: 'Happy birthday Sarah, I hope...', amount: '1.5 SOL', status: 'Completed', statusColor: 'text-accent' },
    { time: '18m ago', preview: 'You inspire me every single day...', amount: '1.5 SOL', status: 'Completed', statusColor: 'text-accent' },
    { time: '1h ago', preview: '██████ [Content Blocked]', amount: '1.5 SOL', status: 'Refunded', statusColor: 'text-destructive', dimmed: true },
    { time: '3h ago', preview: 'Can you congratulate Mike on his...', amount: '1.5 SOL', status: 'Completed', statusColor: 'text-accent' },
    { time: '7h ago', preview: 'Tell my team that we crushed it...', amount: '1.5 SOL', status: 'Completed', statusColor: 'text-accent' },
  ];

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

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
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

          {/* This Month */}
          <Card className="bg-card border-border p-6 space-y-2 md:col-span-3 lg:col-span-1">
            <p className="text-muted-foreground text-sm">This Month</p>
            <h3 className="text-3xl font-bold">8.5 SOL</h3>
            <p className="text-accent text-sm flex items-center gap-1">
              <TrendingUp className="w-4 h-4" /> 23% vs last month
            </p>
          </Card>
        </div>

        {/* Blink URL Card */}
        <Card className="bg-card border-border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">🔗 Your Voice Blink</span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-accent/20 text-accent text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-accent"></span>
                LIVE
              </span>
            </div>
          </div>

          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={blinkUrl}
              readOnly
              className="flex-1 bg-black/40 border border-border rounded-lg px-4 py-2 text-sm font-mono text-muted-foreground"
            />
            <Button
              onClick={() => {
                navigator.clipboard.writeText(blinkUrl)
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
            <Button
              size="sm"
              onClick={() => {
                const shareText = encodeURIComponent(
                  `Get a personalized voice message from me on @AuraCast! 🎙\n${blinkUrl}`
                )
                window.open(`https://twitter.com/intent/tweet?text=${shareText}`, '_blank')
              }}
              className="bg-primary hover:bg-secondary text-primary-foreground"
            >
              <span>🐦 Share on X</span>
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Share this link on X, Telegram, or anywhere — fans can send you voice requests without leaving their feed
          </p>
        </Card>

        {/* Recent Requests Table */}
        <Card className="bg-card border-border p-6 space-y-4">
          <h3 className="text-lg font-bold">Recent Voice Requests</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Time</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Message Preview</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Amount</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {sampleRequests.map((request, idx) => (
                  <tr
                    key={idx}
                    className={`border-b border-border hover:bg-primary/5 transition-colors ${
                      request.dimmed ? 'opacity-60' : ''
                    } ${idx % 2 === 0 ? 'bg-transparent' : 'bg-black/10'}`}
                  >
                    <td className="py-3 px-4 text-muted-foreground">{request.time}</td>
                    <td className="py-3 px-4 font-mono text-xs max-w-xs truncate">{request.preview}</td>
                    <td className="py-3 px-4">{request.amount}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 ${request.statusColor}`}>
                        {request.status === 'Completed' ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <RotateCw className="w-4 h-4" />
                        )}
                        {request.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
