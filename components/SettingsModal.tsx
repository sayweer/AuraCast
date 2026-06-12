'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Loader2, ShieldCheck, X, Trash2 } from 'lucide-react';
import { VoiceLicenseBadge } from '@/components/ui/voice-license-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/components/LanguageProvider';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  selectedPrice: number;
  onDisconnect: () => void;
  onRerecord: () => void;
  onPriceUpdate: (price: number) => void;
  onPriceUpdateSuccess: (newLamports: number) => void;
  blockAdult: boolean;
  blockProfanity: boolean;
  blockPolitical: boolean;
  onFilterUpdate: (key: 'blockAdult' | 'blockProfanity' | 'blockPolitical', value: boolean) => void;
  voiceId: string | null;
  onDeleteVoice: () => Promise<void>;
  statsLoading: boolean;
  getAuthHeaders: (walletAddr: string, forceRefresh?: boolean) => Promise<Record<string, string>>;
  nftMint: string | null;
  onActivateLicense: () => void;
  mintingLicense: boolean;
  licenseError: string | null;
}

export default function SettingsModal({
  isOpen,
  onClose,
  walletAddress,
  selectedPrice,
  onDisconnect,
  onRerecord,
  onPriceUpdate,
  onPriceUpdateSuccess,
  blockAdult,
  blockProfanity,
  blockPolitical,
  onFilterUpdate,
  voiceId,
  onDeleteVoice,
  statsLoading,
  getAuthHeaders,
  nftMint,
  onActivateLicense,
  mintingLicense,
  licenseError,
}: SettingsModalProps) {
  const { t, language } = useLanguage();
  const [newPrice, setNewPrice] = useState(selectedPrice);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [priceSuccess, setPriceSuccess] = useState(false);

  useEffect(() => {
    setNewPrice(selectedPrice);
  }, [selectedPrice]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const handlePriceUpdate = async () => {
    if (newPrice < 0.01 || newPrice > 0.1) {
      setPriceError(t('settings.priceRangeError'));
      return;
    }
    setIsUpdating(true);
    setPriceError(null);
    setPriceSuccess(false);

    const performUpdate = async (retry = true) => {
      try {
        const headers = await getAuthHeaders(walletAddress);
        const res = await fetch('/api/creator/update-price', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: JSON.stringify({
            walletAddress,
            priceInLamports: Math.round(newPrice * 1_000_000_000),
          }),
        });

        if (res.status === 401 && retry) {
          sessionStorage.removeItem(`auracast_session_${walletAddress}`);
          await performUpdate(false);
          return;
        }

        if (res.ok) {
          setPriceSuccess(true);
          onPriceUpdate(newPrice);
          onPriceUpdateSuccess(Math.round(newPrice * 1_000_000_000));
          setTimeout(() => setPriceSuccess(false), 3000);
        } else {
          setPriceError(t('settings.updateFailed'));
        }
      } catch {
        setPriceError(t('settings.networkError'));
      } finally {
        setIsUpdating(false);
      }
    };
    performUpdate();
  };

  return (
    <AnimatePresence>
      {isOpen && (
    <>
      {/* Overlay */}
      <motion.div
        className="fixed inset-0 bg-aura-night/60 backdrop-blur-sm z-40"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      />

      {/* Modal */}
      <motion.div
        className="theme-paper fixed inset-0 flex items-center justify-center p-4 z-50"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <Card className="text-foreground bg-card border border-aura-night/15 w-full max-w-md rounded-2xl p-0 gap-0 max-h-[90vh] flex flex-col overflow-hidden shadow-[0_24px_48px_-12px_rgba(42,14,14,0.45)]">
          {/* Header — olive masthead */}
          <div className="flex items-center justify-between px-6 py-4 bg-aura-olive shrink-0">
            <h2 className="font-display text-xl font-bold tracking-tight text-aura-cream">{t('settings.title')}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-aura-cream/80 hover:text-aura-cream hover:bg-aura-cream/15 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-7">
            {/* Voice Management Section */}
            <div className="space-y-3">
              <h3 className="flex items-center gap-3 font-display text-xs font-semibold uppercase tracking-[0.25em] text-aura-burgundy">
                {t('settings.voiceManagement')}
                <span className="h-px flex-1 bg-aura-night/10" aria-hidden="true" />
              </h3>
              {voiceId ? (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-aura-olive/10 border border-aura-olive/25 mb-3">
                  <div className="w-2 h-2 rounded-full bg-aura-olive animate-pulse" />
                  <span className="text-sm text-aura-olive font-medium">{t('settings.voiceCloneActive')}</span>
                  <span className="text-xs text-muted-foreground ml-auto font-mono">
                    {voiceId.slice(0, 12)}...
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-aura-terracotta/10 border border-aura-terracotta/30 mb-3">
                  <div className="w-2 h-2 rounded-full bg-aura-terracotta" />
                  <span className="text-sm text-aura-burgundy font-medium">{t('settings.noVoiceClone')}</span>
                </div>
              )}
              <Button
                onClick={onRerecord}
                variant="outline"
                className="w-full border-aura-olive/45 text-aura-olive hover:bg-aura-olive/10 hover:text-aura-olive"
              >
                {t('settings.recordNewSample')}
              </Button>
              <button
                onClick={async () => {
                  if (!confirm(t('settings.deleteConfirm'))) return
                  setIsDeleting(true)
                  await onDeleteVoice()
                  setIsDeleting(false)
                }}
                disabled={isDeleting}
                className="w-full text-destructive text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
              >
                {isDeleting ? t('settings.deleting') : t('settings.deleteVoice')}
              </button>
              <p className="text-xs text-muted-foreground">
                {t('settings.permanentRemoveWarn')}
              </p>
            </div>

            {/* Pricing Section */}
            <div className="space-y-3">
              <h3 className="flex items-center gap-3 font-display text-xs font-semibold uppercase tracking-[0.25em] text-aura-burgundy">
                {t('settings.pricing')}
                <span className="h-px flex-1 bg-aura-night/10" aria-hidden="true" />
              </h3>
              <label className="text-sm text-muted-foreground">{t('settings.pricePer150')}</label>
              <div className="flex gap-2 items-center">
                {statsLoading ? (
                  <div className="animate-pulse w-20 h-9 rounded-lg bg-muted" />
                ) : (
                  <input
                    type="number"
                    min={0.01}
                    max={0.1}
                    step={0.01}
                    value={newPrice}
                    onChange={(e) => setNewPrice(parseFloat(e.target.value))}
                    className="w-20 bg-input border border-aura-night/20 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-aura-olive focus:ring-2 focus:ring-aura-olive/25 transition-colors"
                  />
                )}
                <span className="text-sm text-muted-foreground">SOL</span>
                <Button
                  onClick={handlePriceUpdate}
                  disabled={isUpdating || statsLoading}
                  className="bg-aura-olive hover:bg-aura-olive/90 text-aura-cream font-semibold px-4 disabled:opacity-50"
                >
                  {isUpdating ? t('settings.updating') : t('settings.update')}
                </Button>
              </div>
              {priceError && (
                <p className="text-xs text-destructive">{priceError}</p>
              )}
              {priceSuccess && (
                <p className="text-xs text-aura-olive font-medium">{t('settings.updateSuccess')}</p>
              )}
            </div>

            {/* Brand Safety Filters Section */}
            <div className="space-y-4">
              <h3 className="flex items-center gap-3 font-display text-xs font-semibold uppercase tracking-[0.25em] text-aura-burgundy">
                {t('settings.brandSafety')}
                <span className="h-px flex-1 bg-aura-night/10" aria-hidden="true" />
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('settings.brandSafetyDesc')}
              </p>

              {/* Toggle Rows */}
              <div className="space-y-3">
                {/* Adult Content Toggle */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-3 text-sm cursor-pointer">
                    <span>{t('settings.blockAdult')}</span>
                  </label>
                  {statsLoading ? (
                    <div className="animate-pulse w-12 h-6 rounded-full bg-muted" />
                  ) : (
                    <div
                      onClick={() => onFilterUpdate('blockAdult', !blockAdult)}
                      className={`w-12 h-6 rounded-full transition-colors flex items-center cursor-pointer ${
                        blockAdult ? 'bg-aura-olive' : 'bg-aura-night/15'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-card border border-aura-night/10 shadow-sm transition-transform ${
                          blockAdult ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </div>
                  )}
                </div>

                {/* Profanity Toggle */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-3 text-sm cursor-pointer">
                    <span>{t('settings.blockProfanity')}</span>
                  </label>
                  {statsLoading ? (
                    <div className="animate-pulse w-12 h-6 rounded-full bg-muted" />
                  ) : (
                    <div
                      onClick={() => onFilterUpdate('blockProfanity', !blockProfanity)}
                      className={`w-12 h-6 rounded-full transition-colors flex items-center cursor-pointer ${
                        blockProfanity ? 'bg-aura-olive' : 'bg-aura-night/15'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-card border border-aura-night/10 shadow-sm transition-transform ${
                          blockProfanity ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </div>
                  )}
                </div>

                {/* Political Content Toggle */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-3 text-sm cursor-pointer">
                    <span>{t('settings.blockPolitical')}</span>
                  </label>
                  {statsLoading ? (
                    <div className="animate-pulse w-12 h-6 rounded-full bg-muted" />
                  ) : (
                    <div
                      onClick={() => onFilterUpdate('blockPolitical', !blockPolitical)}
                      className={`w-12 h-6 rounded-full transition-colors flex items-center cursor-pointer ${
                        blockPolitical ? 'bg-aura-olive' : 'bg-aura-night/15'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-card border border-aura-night/10 shadow-sm transition-transform ${
                          blockPolitical ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Voice License Section */}
            <div className="space-y-3">
              <h3 className="flex items-center gap-3 font-display text-xs font-semibold uppercase tracking-[0.25em] text-aura-burgundy">
                {t('license.title')}
                <span className="h-px flex-1 bg-aura-night/10" aria-hidden="true" />
              </h3>
              {nftMint ? (
                <VoiceLicenseBadge
                  href={`https://solscan.io/account/${nftMint}${process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'mainnet-beta' ? '' : '?cluster=devnet'}`}
                  language={language as 'tr' | 'en'}
                />
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">{t('license.activateDesc')}</p>
                  <Button
                    onClick={onActivateLicense}
                    disabled={mintingLicense}
                    className="w-full bg-aura-terracotta hover:bg-aura-terracotta/90 text-aura-cream font-semibold flex items-center gap-2"
                  >
                    {mintingLicense ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t('license.minting')}
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        {t('license.activateButton')}
                      </>
                    )}
                  </Button>
                  {licenseError && (
                    <div className="flex items-start gap-2 bg-destructive/5 border border-destructive/20 px-3 py-2 rounded-lg text-destructive text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 text-destructive mt-0.5" />
                      <span>{licenseError}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Account Section — danger zone */}
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
              <h3 className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-destructive">
                {t('settings.account')}
              </h3>
              <Button
                onClick={() => {
                  onDisconnect();
                  onClose();
                }}
                variant="outline"
                className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive bg-transparent"
              >
                {t('settings.disconnectWallet')}
              </Button>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-muted-foreground pt-4 border-t border-aura-night/10">
              {t('settings.versionText')}
            </div>
          </div>
        </Card>
      </motion.div>
    </>
      )}
    </AnimatePresence>
  );
}
