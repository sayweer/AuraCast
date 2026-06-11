'use client';

import { motion } from 'framer-motion'
import { WalletButton } from '@/components/WalletButton'
import { useLanguage } from '@/components/LanguageProvider'
import LanguageToggle from '@/components/LanguageToggle'

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
}

const item = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
}

export default function Landing() {
  const { t } = useLanguage()

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-8">
      {/* Floating Language Toggle */}
      <LanguageToggle className="absolute top-6 right-6" />

      {/* Center Content */}
      <motion.div
        className="flex flex-col items-center justify-center gap-8 max-w-2xl"
        variants={container}
        initial="hidden"
        animate="visible"
      >
        {/* Mic Emblem */}
        <motion.div
          variants={item}
          className="flex items-center justify-center w-24 h-24 rounded-full ember-gradient glow-ember text-5xl"
        >
          🎙
        </motion.div>

        {/* Title */}
        <motion.div variants={item} className="text-center">
          <h1 className="font-display text-7xl font-bold mb-2 ember-text-gradient">
            AuraCast
          </h1>
          <p className="text-lg text-muted-foreground italic">
            {t('landing.slogan')}
          </p>
        </motion.div>

        {/* Main CTA Button */}
        <motion.div
          variants={item}
          className="[&>button]:px-8 [&>button]:py-4 [&>button]:text-lg [&>button]:font-semibold [&>button]:glow-ember mt-4"
        >
          <WalletButton />
        </motion.div>

        {/* Bottom Text */}
        <motion.div variants={item} className="mt-8 text-center text-muted-foreground text-xs">
          {t('landing.joinedCreators')}
        </motion.div>
      </motion.div>
    </div>
  );
}
