'use client'

import { cn } from '@/lib/utils'

interface BrandLogoProps {
  variant?: 'light' | 'dark' | 'cream'
  withWordmark?: boolean
  href?: string | null
  className?: string
}

export function BrandLogo({
  variant = 'dark',
  withWordmark = true,
  href = null,
  className,
}: BrandLogoProps) {
  const content = (
    <>
      <img
        src="/logo.png"
        alt="Voclira"
        className={cn(
          'h-9 w-9 rounded-lg border',
          variant === 'light'
            ? 'border-voclira-burgundy/20'
            : variant === 'cream'
              ? 'border-voclira-cream/30'
              : 'border-ember-3/30'
        )}
      />
      {withWordmark && (
        <span
          className={cn(
            'font-display text-xl font-bold tracking-tight',
            variant === 'light'
              ? 'text-voclira-burgundy'
              : variant === 'cream'
                ? 'text-voclira-cream'
                : 'ember-text-gradient'
          )}
        >
          Voclira
        </span>
      )}
    </>
  )

  const wrapperClass = cn('flex items-center gap-2.5', className)

  if (href) {
    return (
      <a href={href} className={cn(wrapperClass, 'group')}>
        {content}
      </a>
    )
  }

  return <div className={wrapperClass}>{content}</div>
}
