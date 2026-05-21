'use client';

import { useLanguage } from '@/components/LanguageProvider';

interface LanguageToggleProps {
  className?: string;
}

export default function LanguageToggle({ className = '' }: LanguageToggleProps) {
  const { language, setLanguage } = useLanguage();

  return (
    <button
      onClick={() => setLanguage(language === 'en' ? 'tr' : 'en')}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card/65 backdrop-blur-md text-xs font-bold text-foreground hover:bg-white/10 hover:border-primary/50 transition-all duration-300 select-none shadow-md shadow-black/20 active:scale-95 ${className}`}
      aria-label="Toggle language"
    >
      {language === 'en' ? (
        <>
          <span>🇬🇧</span>
          <span>EN</span>
        </>
      ) : (
        <>
          <span>🇹🇷</span>
          <span>TR</span>
        </>
      )}
    </button>
  );
}
