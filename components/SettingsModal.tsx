'use client';

import { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  selectedPrice: number;
  onDisconnect: () => void;
  onRerecord: () => void;
  onPriceUpdate: (price: number) => void;
  onPriceUpdateSuccess: (newLamports: number) => void;
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
}: SettingsModalProps) {
  const [blockAdult, setBlockAdult] = useState(true);
  const [blockProfanity, setBlockProfanity] = useState(true);
  const [blockPolitical, setBlockPolitical] = useState(true);
  const [newPrice, setNewPrice] = useState(selectedPrice);
  const [isUpdating, setIsUpdating] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [priceSuccess, setPriceSuccess] = useState(false);

  const handlePriceUpdate = async () => {
    if (newPrice < 0.01 || newPrice > 0.1) {
      setPriceError('Price must be between 0.01 and 0.1 SOL');
      return;
    }
    setIsUpdating(true);
    setPriceError(null);
    setPriceSuccess(false);

    try {
      const res = await fetch('/api/creator/update-price', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          priceInLamports: Math.round(newPrice * 1_000_000_000),
        }),
      });

      if (res.ok) {
        setPriceSuccess(true);
        onPriceUpdate(newPrice);
        onPriceUpdateSuccess(Math.round(newPrice * 1_000_000_000));
        setTimeout(() => setPriceSuccess(false), 3000);
      } else {
        setPriceError('Update failed. Try again.');
      }
    } catch {
      setPriceError('Network error. Try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
        <Card className="bg-card border-border w-full max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">⚙️ Settings</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-primary/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Account Section */}
          <div className="space-y-3 pb-4 border-b border-border">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Account</h3>
            <Button
              onClick={() => {
                onDisconnect();
                onClose();
              }}
              variant="outline"
              className="w-full border-destructive text-destructive hover:bg-destructive/10"
            >
              🔴 Disconnect Wallet
            </Button>
          </div>

          {/* Voice Management Section */}
          <div className="space-y-3 pb-4 border-b border-border">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Voice Management</h3>
            <Button
              onClick={onRerecord}
              variant="outline"
              className="w-full border-primary text-primary hover:bg-primary/10"
            >
              🎙 Record New Voice Sample
            </Button>
            <button
              onClick={() => console.log('delete voice')}
              className="w-full text-destructive text-sm font-medium hover:opacity-80 transition-opacity"
            >
              🗑 Delete My Voice
            </button>
            <p className="text-xs text-muted-foreground">
              This will permanently remove your voice clone
            </p>
          </div>

          {/* Brand Safety Filters Section */}
          <div className="space-y-4 pb-4 border-b border-border">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Brand Safety Filters</h3>
            <p className="text-sm text-muted-foreground">
              Content your voice will refuse to generate:
            </p>

            {/* Toggle Rows */}
            <div className="space-y-3">
              {/* Adult Content Toggle */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-3 text-sm cursor-pointer">
                  <span>🔞 Block adult (18+) content</span>
                </label>
                <div
                  onClick={() => setBlockAdult(!blockAdult)}
                  className={`w-12 h-6 rounded-full transition-colors flex items-center cursor-pointer ${
                    blockAdult ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      blockAdult ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </div>
              </div>

              {/* Profanity Toggle */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-3 text-sm cursor-pointer">
                  <span>🤬 Block profanity & offensive language</span>
                </label>
                <div
                  onClick={() => setBlockProfanity(!blockProfanity)}
                  className={`w-12 h-6 rounded-full transition-colors flex items-center cursor-pointer ${
                    blockProfanity ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      blockProfanity ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </div>
              </div>

              {/* Political Content Toggle */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-3 text-sm cursor-pointer">
                  <span>🏛 Block political content</span>
                </label>
                <div
                  onClick={() => setBlockPolitical(!blockPolitical)}
                  className={`w-12 h-6 rounded-full transition-colors flex items-center cursor-pointer ${
                    blockPolitical ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      blockPolitical ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Section */}
          <div className="space-y-3 pb-4 border-b border-border">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Pricing</h3>
            <label className="text-sm text-muted-foreground">Price per 150 characters</label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min={0.01}
                max={0.1}
                step={0.01}
                value={newPrice}
                onChange={(e) => setNewPrice(parseFloat(e.target.value))}
                className="w-20 bg-black/40 border border-border rounded-lg px-3 py-2 text-sm"
              />
              <span className="text-sm text-muted-foreground">SOL</span>
              <Button
                onClick={handlePriceUpdate}
                disabled={isUpdating}
                className="bg-primary hover:bg-secondary text-primary-foreground px-3 disabled:opacity-50"
              >
                {isUpdating ? 'Updating...' : 'Update'}
              </Button>
            </div>
            {priceError && (
              <p className="text-xs text-red-400">{priceError}</p>
            )}
            {priceSuccess && (
              <p className="text-xs text-green-400">✓ Price updated successfully!</p>
            )}
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground pt-2">
            AuraCast v1.0.0 — Built at Dev3pack Hackathon 2026
          </div>
        </Card>
      </div>
    </>
  );
}
