'use client';

import { motion } from 'framer-motion'
import {
  BookOpen,
  ChevronDown,
  Clapperboard,
  Coins,
  FileText,
  Flame,
  Gamepad2,
  GraduationCap,
  Heart,
  Megaphone,
  Mic,
  ShieldCheck,
} from 'lucide-react'
import { WalletButton } from '@/components/WalletButton'
import { useLanguage } from '@/components/LanguageProvider'
import LanguageToggle from '@/components/LanguageToggle'
import { BrandLogo } from '@/components/BrandLogo'
import NewsMarquee from '@/components/ui/news-marquee'
import { GooeyText } from '@/components/ui/gooey-text-morphing'
import DisplayCards from '@/components/ui/display-cards'
import RadialOrbitalTimeline, { OrbitalItem } from '@/components/ui/radial-orbital-timeline'


const NEWS_IMAGES = Array.from({ length: 17 }, (_, i) => `/news/news-${i + 1}.jpg`)

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
}

const item = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
}

const FEATURE_STACK_CLASSES = [
  "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-[100%] before:rounded-xl before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-aura-cream/25 grayscale-[60%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
  "[grid-area:stack] translate-x-16 translate-y-10 hover:-translate-y-1 before:absolute before:w-[100%] before:rounded-xl before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-aura-cream/25 grayscale-[60%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
  '[grid-area:stack] translate-x-32 translate-y-20 hover:translate-y-10',
]

export default function Landing() {
  const { t, language } = useLanguage()

  const gooeyWords = language === 'tr'
    ? ['lisans', 'kazan', 'kontrol', 'gelecek', 'sesin geleceği']
    : ['license', 'earn', 'control', 'future', 'your voice']

  const features = [
    {
      key: 'cloning',
      icon: <Mic className="size-4 text-aura-cream" />,
      iconClassName: 'bg-aura-olive',
    },
    {
      key: 'income',
      icon: <Coins className="size-4 text-aura-cream" />,
      iconClassName: 'bg-aura-terracotta',
    },
    {
      key: 'licensing',
      icon: <FileText className="size-4 text-aura-cream" />,
      iconClassName: 'bg-aura-burgundy',
    },
  ]

  const featureCards = features.map((f, i) => ({
    icon: f.icon,
    iconClassName: f.iconClassName,
    title: t(`landing.features.${f.key}.title`),
    description: t(`landing.features.${f.key}.desc`),
    date: t(`landing.features.${f.key}.tag`),
    className: FEATURE_STACK_CLASSES[i],
  }))

  const useCases = [
    { key: 'motivation', icon: Flame, relatedIds: [2, 5] },
    { key: 'emotional', icon: Heart, relatedIds: [1] },
    { key: 'audiobook', icon: BookOpen, relatedIds: [6, 4] },
    { key: 'dubbing', icon: Clapperboard, relatedIds: [3, 7] },
    { key: 'podcast', icon: Mic, relatedIds: [1, 8] },
    { key: 'education', icon: GraduationCap, relatedIds: [3] },
    { key: 'gaming', icon: Gamepad2, relatedIds: [4] },
    { key: 'ads', icon: Megaphone, relatedIds: [5] },
  ]

  const orbitalItems: OrbitalItem[] = useCases.map((uc, i) => ({
    id: i + 1,
    title: t(`landing.useCases.items.${uc.key}.title`),
    content: t(`landing.useCases.items.${uc.key}.desc`),
    icon: uc.icon,
    relatedIds: uc.relatedIds,
  }))

  return (
    <div className="aura-landing relative min-h-screen bg-aura-cream text-aura-burgundy overflow-x-hidden">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative flex min-h-screen flex-col">
        <NewsMarquee images={NEWS_IMAGES} />

        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between px-6 pt-6">
          <BrandLogo variant="light" withWordmark={false} />
          <LanguageToggle className="!bg-aura-paper !text-aura-burgundy !border-aura-burgundy/20 !shadow-none hover:!bg-aura-paper/80" />
        </div>

        <motion.div
          className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 px-4 pb-16 text-center"
          variants={container}
          initial="hidden"
          animate="visible"
        >
          {/* Masthead */}
          <motion.div variants={item} className="w-full max-w-3xl">
            <div className="border-y-2 border-aura-burgundy/50 py-1">
              <div className="border-y border-aura-burgundy/30 py-4">
                <h1 className="font-display font-black tracking-tight text-6xl sm:text-7xl md:text-8xl">
                  AuraCast
                </h1>
              </div>
            </div>
            <p
              lang={language}
              className="mt-3 font-display text-sm uppercase tracking-[0.25em] text-aura-burgundy/70"
            >
              {t('landing.edition')}
            </p>
          </motion.div>

          <motion.div variants={item} className="w-full">
            <GooeyText
              texts={gooeyWords}
              morphTime={1}
              cooldownTime={1.5}
              className="h-14 sm:h-20"
              textClassName="font-display font-semibold text-4xl sm:text-6xl text-aura-terracotta whitespace-nowrap"
            />
          </motion.div>

          <motion.p
            variants={item}
            className="max-w-md italic text-aura-burgundy/80"
          >
            {t('landing.heroTagline')}
          </motion.p>

          {/* CTA */}
          <motion.div variants={item} className="mt-4 flex flex-col items-center gap-3">
            <div className="aura-ring">
              <span className="[&>button]:px-8 [&>button]:py-3.5 [&>button]:text-base">
                <WalletButton />
              </span>
            </div>
            <p className="text-xs text-aura-burgundy/60">{t('landing.ctaHint')}</p>
          </motion.div>
        </motion.div>

        {/* Scroll cue */}
        <a
          href="#features"
          onClick={(e) => {
            e.preventDefault()
            document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
          }}
          className="absolute inset-x-0 bottom-6 z-10 flex flex-col items-center gap-1 text-aura-burgundy/60 transition-colors hover:text-aura-burgundy"
        >
          <span className="text-[11px] uppercase tracking-[0.2em]">
            {t('landing.scrollCue')}
          </span>
          <ChevronDown className="size-4 animate-bounce motion-reduce:animate-none" />
        </a>
      </section>

      {/* ── Creator features ─────────────────────────────────── */}
      <section id="features" className="relative mx-auto max-w-5xl px-6 py-20">
        <header className="mb-12 flex items-center gap-4">
          <span className="h-px flex-1 bg-aura-burgundy/30" />
          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.25em]">
            {t('landing.features.title')}
          </h2>
          <span className="h-px flex-1 bg-aura-burgundy/30" />
        </header>

        {/* Desktop: skewed stack */}
        <div className="hidden md:flex justify-center pb-24">
          <DisplayCards cards={featureCards} />
        </div>

        {/* Mobile: plain vertical cards */}
        <div className="flex flex-col gap-4 md:hidden">
          {featureCards.map((card) => (
            <div
              key={card.date}
              className="flex flex-col gap-2 rounded-xl border border-aura-burgundy/15 bg-aura-paper/90 px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <span className={`relative inline-block rounded-full p-1.5 ${card.iconClassName}`}>
                  {card.icon}
                </span>
                <p className="text-lg font-medium">{card.title}</p>
              </div>
              <p className="text-sm text-aura-burgundy/70">{card.description}</p>
              <p className="text-xs uppercase tracking-wide text-aura-terracotta">{card.date}</p>
            </div>
          ))}
        </div>

        {/* Content-control footnote */}
        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-aura-burgundy/70">
          <ShieldCheck className="size-4 shrink-0 text-aura-olive" />
          <p>{t('landing.features.control')}</p>
        </div>
      </section>

      {/* ── Use cases: night-edition orbital ─────────────────── */}
      <section className="relative bg-aura-night py-20 text-aura-cream">
        <div className="mx-auto max-w-5xl px-6">
          <header className="mb-8 flex items-center gap-4">
            <span className="h-px flex-1 bg-aura-cream/30" />
            <h2 className="font-display text-sm font-semibold uppercase tracking-[0.25em]">
              {t('landing.useCases.title')}
            </h2>
            <span className="h-px flex-1 bg-aura-cream/30" />
          </header>

          {/* Desktop: orbiting use cases */}
          <div className="hidden md:block">
            <RadialOrbitalTimeline items={orbitalItems} />
          </div>

          {/* Mobile: classified-ads grid */}
          <div className="grid grid-cols-2 gap-px border border-aura-cream/20 bg-aura-cream/20 md:hidden">
            {useCases.map(({ key, icon: Icon }) => (
              <div key={key} className="bg-aura-night p-5">
                <Icon className="mb-3 size-5 text-aura-terracotta" />
                <p className="font-display font-semibold">
                  {t(`landing.useCases.items.${key}.title`)}
                </p>
                <p className="mt-1 text-xs text-aura-cream/60">
                  {t(`landing.useCases.items.${key}.desc`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer CTA ───────────────────────────────────────── */}
      <section className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 pb-24 text-center">
        <div className="w-full border-y-2 border-aura-burgundy/50 py-0.5">
          <div className="w-full border-y border-aura-burgundy/30 py-6">
            <p className="text-sm text-aura-burgundy/70">{t('landing.joinedCreators')}</p>
          </div>
        </div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-aura-burgundy/50">
          AuraCast — Solana
        </p>
      </section>
    </div>
  )
}
