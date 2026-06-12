'use client'

import { cn } from '@/lib/utils'

interface BrandLogoProps {
  variant?: 'light' | 'dark'
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
        src="/logo.jpg"
        alt="AuraCast"
        className={cn(
          'h-9 w-9 rounded-lg border',
          variant === 'light' ? 'border-aura-burgundy/20' : 'border-ember-3/30'
        )}
      />
      {withWordmark && (
        <span
          className={cn(
            'font-display text-xl font-bold tracking-tight',
            variant === 'light' ? 'text-aura-burgundy' : 'ember-text-gradient'
          )}
        >
          AuraCast
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
