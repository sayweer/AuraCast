'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletButton } from '@/components/WalletButton'
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js'
import { useLanguage } from '@/components/LanguageProvider'
import LanguageToggle from '@/components/LanguageToggle'
import type { Mood } from '@/types'

interface Creator {
  wallet_address: string
  creator_name: string
  price_lamports: number
  is_active: boolean
}

const MOOD_OPTIONS: Array<{ id: Mood; emoji: string }> = [
  { id: 'happy',    emoji: '😊' },
  { id: 'excited',  emoji: '🎉' },
  { id: 'calm',     emoji: '🌿' },
  { id: 'sad',      emoji: '🥲' },
  { id: 'angry',    emoji: '😤' },
  { id: 'romantic', emoji: '💝' },
]

const base64ToBlobUrl = (base64: string, contentType = 'audio/mpeg') => {
  try {
    const byteCharacters = atob(base64)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: contentType })
    return URL.createObjectURL(blob)
  } catch (e) {
    console.error('Failed to convert base64 to blob url', e)
    return `data:${contentType};base64,${base64}`
  }
}

export default function FanPage() {
  const params = useParams()
  const creatorWallet = params.creatorWallet as string
  const { publicKey, sendTransaction, connected } = useWallet()
  const { t, language } = useLanguage()

  const [creator, setCreator] = useState<Creator | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [selectedMood, setSelectedMood] = useState<Mood>('calm')
  const [isPaying, setIsPaying] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [txSignature, setTxSignature] = useState<string | null>(null)
  const [purchaseId, setPurchaseId] = useState<string | null>(null)
  const [platformWallet, setPlatformWallet] = useState<string | null>(null)

  // Cleanup object URL to prevent memory leaks
  useEffect(() => {
    return () => {
      if (audioUrl && audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  // Fetch creator on mount
  useEffect(() => {
    const fetchCreator = async () => {
      try {
        const res = await fetch(`/api/creator/${creatorWallet}?public=true`)
        if (res.ok) {
          const data = await res.json()
          setCreator(data)
        } else {
          setError(res.status === 404 ? t('fan.creatorNotFound') : (language === 'tr' ? 'Yaratıcı yüklenemedi' : 'Failed to load creator'))
        }
      } catch {
        setError(language === 'tr' ? 'Ağ hatası — lütfen tekrar deneyin' : 'Network error — please try again')
      } finally {
        setLoading(false)
      }
    }
    fetchCreator()
  }, [creatorWallet, t, language])

  // Fetch platform wallet on mount
  useEffect(() => {
    const fetchPlatformConfig = async () => {
      try {
        const res = await fetch('/api/platform-config')
        if (res.ok) {
          const data = await res.json()
          setPlatformWallet(data.platformWallet)
        }
      } catch {
        // Platform config fetch failure is non-blocking;
        // payment will fail gracefully if wallet is missing
      }
    }
    fetchPlatformConfig()
  }, [])

  // Price calculation — charUnits is 0 when message is empty
  const charUnits = message.length > 0 ? Math.ceil(message.length / 150) : 0
  const totalLamports = charUnits * (creator?.price_lamports ?? 0)
  const totalSol = (totalLamports / LAMPORTS_PER_SOL).toFixed(4)
  const pricePerUnit = ((creator?.price_lamports ?? 0) / LAMPORTS_PER_SOL).toFixed(4)

  // Pay and generate
  const handlePayAndGenerate = async () => {
    if (!publicKey || !creator || !message.trim()) return
    if (!platformWallet) {
      setError(t('fan.configNotLoaded'))
      return
    }
    setIsPaying(true)
    setError(null)
    setAudioUrl(null)

    try {
      const connection = new Connection(
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? 'https://api.devnet.solana.com',
        'confirmed'
      )

      // Split payment: 90% to creator, 10% platform fee
      const platformFee = Math.floor(totalLamports * 0.1)
      const creatorAmount = totalLamports - platformFee

      // Build transaction with two transfers
      const transaction = new Transaction()
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(creatorWallet),
          lamports: creatorAmount,
        }),
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(platformWallet),
          lamports: platformFee,
        })
      )
      transaction.feePayer = publicKey
      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash

      // Send transaction via Phantom
      const signature = await sendTransaction(transaction, connection)
      setTxSignature(signature)

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed')

      // Generate voice
      const res = await fetch('/api/voice/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorWallet,
          fanText: message,
          txSignature: signature,
          buyerWallet: publicKey.toBase58(),
          mood: selectedMood,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? (language === 'tr' ? 'Ses üretimi başarısız oldu' : 'Generation failed'))
        return
      }

      const blobUrl = base64ToBlobUrl(data.audioBase64)
      setAudioUrl(blobUrl)
      setPurchaseId(typeof data.purchaseId === 'string' ? data.purchaseId : null)
      setTxSignature(null)
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : (language === 'tr' ? 'Ödeme başarısız oldu' : 'Payment failed')
      setError(errMessage)
    } finally {
      setIsPaying(false)
    }
  }

  return (
    <div className="app-container min-h-screen w-full bg-background text-foreground">
      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(139,26,47,0.18) 0%, transparent 70%)',
        }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 border-b border-border/40">
        <a href="/" className="flex items-center gap-2 group">
          <span className="text-2xl">🎙</span>
          <span
            className="text-xl font-bold tracking-tight"
            style={{
              background: 'linear-gradient(90deg, #F5F0F1 0%, #B91C3C 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            AuraCast
          </span>
        </a>
        <LanguageToggle />
      </header>

      {/* Main content */}
      <main className="relative z-10 flex flex-col items-center justify-center px-4 py-16 min-h-[calc(100vh-80px)]">
        <div className="w-full max-w-lg">

          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-24">
              <div
                className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"
              />
              <p className="text-muted-foreground text-sm">{t('fan.loadingCreator')}</p>
            </div>
          )}

          {/* Creator not found or inactive */}
          {!loading && (!creator || !creator.is_active) && (
            <div className="flex flex-col items-center justify-center gap-4 py-24">
              <div className="text-5xl">🔍</div>
              <h2 className="text-xl font-semibold text-foreground">
                {creator && !creator.is_active ? t('fan.creatorUnavailable') : t('fan.creatorNotFound')}
              </h2>
              <p className="text-muted-foreground text-sm text-center">
                {creator && !creator.is_active
                  ? t('fan.creatorUnavailableDesc')
                  : t('fan.creatorNotFoundDesc')}
              </p>
            </div>
          )}

          {/* Creator card */}
          {!loading && creator && creator.is_active && (
            <div className="flex flex-col gap-6">

              {/* Creator identity card */}
              <div
                className="rounded-2xl border border-border/60 p-6 flex flex-col gap-3"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(139,26,47,0.12) 0%, rgba(6,0,8,0.6) 100%)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(139,26,47,0.5) 0%, rgba(185,28,60,0.3) 100%)',
                      border: '1.5px solid rgba(185,28,60,0.4)',
                    }}
                  >
                    🎙
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
                      {t('fan.sendVoiceTo')}
                    </p>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                      {creator.creator_name ?? creatorWallet.slice(0, 8)}
                    </h1>
                  </div>
                </div>

                {/* Price pill */}
                <div
                  className="inline-flex items-center gap-2 self-start rounded-full px-3 py-1 text-xs font-medium"
                  style={{
                    background: 'rgba(185,28,60,0.15)',
                    border: '1px solid rgba(185,28,60,0.3)',
                    color: '#F5A0B0',
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"
                  />
                  {t('fan.pricePer150Chars', { price: pricePerUnit })}
                </div>
              </div>

              {/* Message form — textarea + mood always visible (composing does not require wallet) */}
              <div className="flex flex-col gap-4">

                {/* Textarea */}
                <div
                  className="rounded-2xl border border-border/60 p-1 flex flex-col gap-0"
                  style={{
                    background: 'rgba(139,26,47,0.07)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <textarea
                    id="fan-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value.slice(0, 300))}
                    placeholder={t('fan.typeMessagePlaceholder')}
                    rows={4}
                    className="w-full resize-none rounded-xl px-4 pt-4 pb-2 text-sm text-foreground placeholder:text-muted-foreground bg-transparent outline-none focus:outline-none"
                  />
                  <div className="flex justify-end px-4 pb-3">
                    <span
                      className="text-xs"
                      style={{ color: message.length >= 270 ? '#ef4444' : 'var(--muted-foreground)' }}
                    >
                      {message.length}/300
                    </span>
                  </div>
                </div>

                {/* Mood selector */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                    {t('fan.moodLabel')}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {MOOD_OPTIONS.map((m) => {
                      const active = selectedMood === m.id
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSelectedMood(m.id)}
                          className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                          style={
                            active
                              ? {
                                  background: 'linear-gradient(135deg, #8B1A2F 0%, #B91C3C 100%)',
                                  borderColor: 'rgba(185,28,60,0.6)',
                                  color: '#ffffff',
                                  boxShadow: '0 0 12px rgba(185,28,60,0.35)',
                                }
                              : {
                                  background: 'rgba(0,0,0,0.25)',
                                  borderColor: 'rgba(255,255,255,0.08)',
                                  color: 'var(--muted-foreground)',
                                }
                          }
                        >
                          <span className="mr-1">{m.emoji}</span>
                          {t(`fan.mood.${m.id}`)}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Wallet prompt — shown when not connected */}
                {!connected && (
                  <div
                    className="rounded-2xl border border-border/60 p-8 flex flex-col items-center gap-5 text-center"
                    style={{
                      background: 'rgba(139,26,47,0.07)',
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    <div className="text-4xl">👛</div>
                    <div className="flex flex-col gap-1">
                      <p className="font-semibold text-foreground">{t('fan.connectWalletPrompt')}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('fan.receiveAiVoiceClip')}
                      </p>
                    </div>
                    <WalletButton />
                  </div>
                )}

                {/* Pay flow — only when wallet connected */}
                {connected && (
                  <>

                  {/* Price preview */}
                  <div
                    className="rounded-xl border px-4 py-3 flex items-center justify-between gap-2"
                    style={{
                      background: 'rgba(185,28,60,0.12)',
                      borderColor: 'rgba(185,28,60,0.35)',
                    }}
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">
                        {charUnits > 0
                          ? t('fan.priceUnitLabel', { units: charUnits, plural: charUnits !== 1 ? 's' : '', price: pricePerUnit })
                          : t('fan.priceLabel', { price: pricePerUnit })}
                      </span>
                    </div>
                    <div
                      className="font-bold text-base"
                      style={{ color: '#F26A82' }}
                    >
                      {charUnits > 0 ? `= ${totalSol} SOL` : '—'}
                    </div>
                  </div>

                  {/* Pay button */}
                  <button
                    id="pay-and-generate-btn"
                    onClick={handlePayAndGenerate}
                    disabled={!message.trim() || isPaying}
                    className="w-full rounded-xl py-3.5 px-6 font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: !message.trim() || isPaying
                        ? 'rgba(139,26,47,0.3)'
                        : 'linear-gradient(135deg, #8B1A2F 0%, #B91C3C 100%)',
                      color: '#ffffff',
                      boxShadow: !message.trim() || isPaying
                        ? 'none'
                        : '0 0 24px rgba(185,28,60,0.35)',
                    }}
                  >
                    {isPaying ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        {t('fan.processingPayment')}
                      </>
                    ) : (
                      <>
                        {t('fan.payAndGenerate', { price: totalSol })}
                      </>
                    )}
                  </button>

                  {/* Error */}
                  {error && (
                    <div
                      className="rounded-xl px-4 py-3 text-sm flex items-start gap-2"
                      style={{
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        color: '#fca5a5',
                      }}
                    >
                      <span className="mt-0.5 flex-shrink-0">⚠️</span>
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Transaction confirmation */}
                  {txSignature && !audioUrl && isPaying && (
                    <p className="text-xs text-muted-foreground text-center">
                      {t('fan.txConfirmed')}
                    </p>
                  )}

                  {/* Audio player */}
                  {audioUrl && (
                    <div
                      className="rounded-2xl border border-border/60 p-5 flex flex-col gap-3"
                      style={{
                        background:
                          'linear-gradient(135deg, rgba(139,26,47,0.15) 0%, rgba(6,0,8,0.5) 100%)',
                        backdropFilter: 'blur(12px)',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🎉</span>
                        <p className="font-semibold text-foreground text-sm">
                          {t('fan.voiceReady')}
                        </p>
                      </div>
                      <audio
                        controls
                        playsInline
                        src={audioUrl}
                        className="w-full mt-1"
                        style={{ accentColor: '#B91C3C' }}
                        onPlay={() => {
                          if (!purchaseId || !publicKey) return
                          fetch(`/api/voice/play/${purchaseId}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ buyerWallet: publicKey.toBase58() }),
                          }).catch(() => {
                            /* play tracking is best-effort */
                          })
                        }}
                      />
                      <a
                        href={audioUrl}
                        download="voice-message.mp3"
                        className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150"
                        style={{
                          background: 'rgba(185,28,60,0.15)',
                          border: '1px solid rgba(185,28,60,0.35)',
                          color: '#F26A82',
                        }}
                      >
                        {t('fan.downloadAudio')}
                      </a>
                    </div>
                  )}
                  </>
                )}
              </div>

            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center">
        <p className="text-xs text-muted-foreground">
          {t('fan.protectedSafety')}
        </p>
      </footer>
    </div>
  )
}
