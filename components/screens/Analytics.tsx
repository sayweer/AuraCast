'use client'

import { useEffect, useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Loader2, TrendingUp } from 'lucide-react'
import type {
  AnalyticsRangeDays,
  AnalyticsResponse,
  RecentPurchaseRow,
} from '@/types'
import { useLanguage } from '@/components/LanguageProvider'

interface AnalyticsProps {
  walletAddress: string
  getSignature: () => Promise<{ signature: string; nonce: string }>
}

const RANGES: AnalyticsRangeDays[] = [7, 30, 90]

function lamportsToSol(n: number, fractionDigits = 4): string {
  return (n / 1_000_000_000).toFixed(fractionDigits)
}

function truncateWallet(w: string): string {
  return `${w.slice(0, 4)}…${w.slice(-4)}`
}

function formatDate(iso: string, lang: string): string {
  const d = new Date(iso)
  return d.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', {
    year: '2-digit',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
    case 'rejected':
      return 'bg-rose-500/15 text-rose-300 border-rose-500/25'
    case 'refunded':
      return 'bg-amber-500/15 text-amber-300 border-amber-500/25'
    default:
      return 'bg-zinc-500/15 text-zinc-300 border-zinc-500/25'
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

export default function Analytics({ walletAddress, getSignature }: AnalyticsProps) {
  const { t } = useLanguage()
  const [days, setDays] = useState<AnalyticsRangeDays>(30)
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    let ignore = false

    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const { signature, nonce } = await getSignature()
        const res = await fetch(
          `/api/creator/analytics/${walletAddress}?days=${days}`,
          {
            headers: {
              'x-wallet-signature': signature,
              'x-wallet-nonce': nonce,
            },
            cache: 'no-store',
          }
        )
        if (ignore) return
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null
          setError(body?.error ?? t('dashboard.errorLoading'))
          setData(null)
          return
        }
        const json = (await res.json()) as AnalyticsResponse
        if (ignore) return
        setData(json)
      } catch {
        if (!ignore) {
          setError(t('dashboard.errorLoading'))
          setData(null)
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    run()
    return () => {
      ignore = true
    }
  }, [walletAddress, days, getSignature, t])

  const handleExport = async () => {
    setExporting(true)
    try {
      const { signature, nonce } = await getSignature()
      const res = await fetch(
        `/api/creator/analytics/${walletAddress}/export?days=${days}`,
        {
          headers: {
            'x-wallet-signature': signature,
            'x-wallet-nonce': nonce,
          },
        }
      )
      if (!res.ok) {
        throw new Error(`Export failed (HTTP ${res.status})`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `auracast-${days}d.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      alert(t('settings.updateFailed'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="inline-flex rounded-lg border border-border bg-card/40 p-1">
          {RANGES.map((r) => {
            const active = r === days
            return (
              <button
                key={r}
                onClick={() => setDays(r)}
                className={
                  'px-4 py-1.5 text-sm font-medium rounded-md transition-colors ' +
                  (active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground')
                }
              >
                {r}d
              </button>
            )
          })}
        </div>
        <Button
          onClick={handleExport}
          disabled={exporting || loading || !data}
          variant="outline"
          size="sm"
        >
          {exporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {exporting ? t('analytics.exporting') : t('analytics.exportCsv')}
        </Button>
      </div>

      {loading && <SkeletonGrid />}

      {!loading && error && (
        <Card className="bg-rose-500/10 border-rose-500/30 p-6">
          <p className="text-sm text-rose-300">{error}</p>
        </Card>
      )}

      {!loading && !error && data && (
        <>
          <SummaryCards data={data} />
          <ChartCard data={data} days={days} />
          <RecentTable rows={data.recent} />
        </>
      )}
    </div>
  )
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="bg-card border-border p-6">
          <div className="h-3 w-24 bg-muted-foreground/20 rounded mb-3 animate-pulse" />
          <div className="h-8 w-32 bg-muted-foreground/20 rounded animate-pulse" />
        </Card>
      ))}
    </div>
  )
}

function SummaryCards({ data }: { data: AnalyticsResponse }) {
  const { t } = useLanguage()
  const s = data.summary
  const successPct = (s.success_rate * 100).toFixed(1)

  const cards = [
    {
      label: t('analytics.grossRevenue'),
      value: `${lamportsToSol(s.total_gross_lamports, 4)} SOL`,
      sub: `${t('analytics.feePaid')} ${lamportsToSol(s.total_platform_fee_lamports, 4)} SOL`,
    },
    {
      label: t('analytics.netEarned'),
      value: `${lamportsToSol(s.total_net_lamports, 4)} SOL`,
      sub: t('analytics.netSolAfterFee'),
    },
    {
      label: t('analytics.uniqueFans'),
      value: String(s.unique_fans),
      sub: t('analytics.fansSubtext'),
    },
    {
      label: t('analytics.successRate'),
      value: `${successPct}%`,
      sub: t('analytics.rejectedSubtext', { count: s.total_rejected }),
    },
    {
      label: t('analytics.avgPrice'),
      value: `${lamportsToSol(s.avg_price_lamports, 4)} SOL`,
      sub: t('analytics.completedSubtext'),
    },
    {
      label: t('analytics.totalPlays'),
      value: String(s.total_plays),
      sub: t('analytics.playsSubtext'),
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((c, idx) => (
        <Card key={idx} className="bg-card border-border p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wide mb-2">
                {c.label}
              </p>
              <h3 className="text-2xl font-bold">{c.value}</h3>
              <p className="text-muted-foreground text-xs mt-1">{c.sub}</p>
            </div>
            {idx === 0 && <TrendingUp className="w-5 h-5 text-primary" />}
          </div>
        </Card>
      ))}
    </div>
  )
}

function ChartCard({ data, days }: { data: AnalyticsResponse; days: AnalyticsRangeDays }) {
  const { t, language } = useLanguage()
  if (data.summary.total_completed === 0 && data.summary.total_rejected === 0) {
    return (
      <Card className="bg-card border-border p-12">
        <div className="flex flex-col items-center justify-center text-center gap-2">
          <div className="text-3xl">📈</div>
          <p className="font-semibold">{t('analytics.noActivity')}</p>
          <p className="text-sm text-muted-foreground">
            {t('analytics.noActivityDesc', { days })}
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">{t('analytics.activityOverTime')}</h3>
        <p className="text-xs text-muted-foreground">
          {t('analytics.activityDesc')}
        </p>
      </div>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.timeseries} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f1f23" />
            <XAxis
              dataKey="date"
              tickFormatter={(d: string) => d.slice(5)}
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis
              yAxisId="left"
              stroke="#C41E3A"
              fontSize={12}
              tickFormatter={(v: number) => (v / 1e9).toFixed(2)}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#a78bfa"
              fontSize={12}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: '#0a0a0e',
                border: '1px solid #27272a',
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: '#F5F0F1' }}
              formatter={(value, name) => {
                const localizedName = name === 'Net SOL' ? t('analytics.netSol') : (language === 'tr' ? 'Mesaj' : 'Messages')
                if (name === 'Net SOL' && typeof value === 'number') {
                  return [`${(value / 1e9).toFixed(4)} SOL`, localizedName]
                }
                return [String(value), localizedName]
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              iconType="circle"
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="net_lamports"
              name={t('analytics.netSol')}
              stroke="#C41E3A"
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="messages"
              name={language === 'tr' ? 'Mesaj' : 'Messages'}
              stroke="#a78bfa"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

function RecentTable({ rows }: { rows: RecentPurchaseRow[] }) {
  const { t, language } = useLanguage()
  if (rows.length === 0) {
    return (
      <Card className="bg-card border-border p-6">
        <p className="text-sm text-muted-foreground">{language === 'tr' ? 'Bu dönemde yakın zamanda herhangi bir işlem gerçekleşmedi.' : 'No recent activity in this period.'}</p>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border p-6">
      <h3 className="text-lg font-semibold mb-4">{t('analytics.recentActivity')}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-border">
              <th className="pb-2 pr-4 font-normal">{t('analytics.date')}</th>
              <th className="pb-2 pr-4 font-normal">{t('analytics.fan')}</th>
              <th className="pb-2 pr-4 font-normal text-right">{t('analytics.netSol')}</th>
              <th className="pb-2 pr-4 font-normal text-right">{t('analytics.plays')}</th>
              <th className="pb-2 font-normal">{t('analytics.status')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const net = r.amount_lamports - r.platform_fee_lamports
              return (
                <tr key={r.id} className="border-b border-border/30 last:border-0">
                  <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                    {formatDate(r.created_at, language)}
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs">
                    {truncateWallet(r.buyer_wallet)}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">
                    {r.status === 'completed' ? lamportsToSol(net, 4) : '—'}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">
                    {r.status === 'completed' ? r.play_count : '—'}
                  </td>
                  <td className="py-3">
                    <span
                      className={
                        'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ' +
                        statusBadgeClass(r.status)
                      }
                      title={r.rejection_reason ?? undefined}
                    >
                      {statusLabel(r.status, t)}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
