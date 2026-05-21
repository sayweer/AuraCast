'use client';

import { WalletButton } from '@/components/WalletButton'
import { useLanguage } from '@/components/LanguageProvider'
import LanguageToggle from '@/components/LanguageToggle'

export default function Landing() {
  const { t } = useLanguage()

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-8">
      {/* Floating Language Toggle */}
      <LanguageToggle className="absolute top-6 right-6" />

      {/* Center Content */}
      <div className="flex flex-col items-center justify-center gap-8 max-w-2xl">
        {/* Mic Emoji */}
        <div className="text-6xl">🎙</div>

        {/* Title */}
        <div className="text-center">
          <h1 className="text-7xl font-bold mb-2 bg-gradient-to-r from-secondary to-pink-500 bg-clip-text text-transparent">
            AuraCast
          </h1>
          <p className="text-lg text-muted-foreground italic">
            {t('landing.slogan')}
          </p>
        </div>

        {/* Main CTA Button */}
        <div className="[&>button]:bg-primary [&>button]:text-white [&>button]:px-8 [&>button]:py-4 [&>button]:rounded-xl [&>button]:text-lg [&>button]:font-semibold [&>button:hover]:bg-secondary mt-4">
          <WalletButton />
        </div>

        {/* Bottom Text */}
        <div className="mt-8 text-center text-muted-foreground text-xs">
          {t('landing.joinedCreators')}
        </div>
      </div>
    </div>
  );
}
