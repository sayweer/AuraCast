'use client'

import { cn } from '@/lib/utils'
import { Zap, Crown } from 'lucide-react'
import { useLanguage } from '@/components/LanguageProvider'
import type { CloneType } from '@/types'

interface CloneTypeSelectProps {
  value: CloneType
  onChange: (type: CloneType) => void
}

/** IVC (instant) vs PVC (professional) cloning method picker, shown at the top of step 1. */
export function CloneTypeSelect({ value, onChange }: CloneTypeSelectProps) {
  const { t } = useLanguage()

  const options: Array<{
    id: CloneType
    icon: typeof Zap
    title: string
    desc: string
    badge: string
  }> = [
    {
      id: 'ivc',
      icon: Zap,
      title: t('onboarding.modeIvcTitle'),
      desc: t('onboarding.modeIvcDesc'),
      badge: t('onboarding.modeIvcBadge'),
    },
    {
      id: 'pvc',
      icon: Crown,
      title: t('onboarding.modePvcTitle'),
      desc: t('onboarding.modePvcDesc'),
      badge: t('onboarding.modePvcBadge'),
    },
  ]

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{t('onboarding.modeTitle')}</label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((opt) => {
          const Icon = opt.icon
          const active = value === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={cn(
                'text-left rounded-xl border p-4 transition-all',
                active
                  ? 'border-primary bg-primary/10 ring-1 ring-primary/40'
                  : 'border-border bg-background hover:border-primary/50'
              )}
            >
              <div className="flex items-center justify-between">
                <Icon className={cn('w-5 h-5', active ? 'text-ember-3' : 'text-muted-foreground')} />
                <span
                  className={cn(
                    'text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full',
                    active ? 'bg-primary/20 text-ember-3' : 'bg-muted text-muted-foreground'
                  )}
                >
                  {opt.badge}
                </span>
              </div>
              <div className="mt-2 font-display font-bold">{opt.title}</div>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{opt.desc}</p>
            </button>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground">{t('onboarding.modeSubtitle')}</p>
    </div>
  )
}
