'use client';

import { cn } from '@/lib/utils'
import { Sparkles } from 'lucide-react'

interface DisplayCardProps {
  className?: string
  icon?: React.ReactNode
  title?: string
  description?: string
  date?: string
  iconClassName?: string
  titleClassName?: string
}

function DisplayCard({
  className,
  icon = <Sparkles className="size-4 text-aura-cream" />,
  title = 'Featured',
  description = 'Discover amazing content',
  date = 'Just now',
  iconClassName = 'bg-aura-olive',
  titleClassName = 'text-aura-burgundy',
}: DisplayCardProps) {
  return (
    <div
      className={cn(
        "relative flex h-36 w-[22rem] -skew-y-[8deg] select-none flex-col justify-between rounded-xl border-2 border-aura-burgundy/25 bg-aura-paper shadow-[0_8px_30px_rgba(123,37,37,0.18)] px-4 py-3 transition-all duration-700 after:absolute after:-right-1 after:top-[-5%] after:h-[110%] after:w-[20rem] after:bg-gradient-to-l after:from-aura-cream/80 after:to-transparent after:content-[''] hover:border-aura-burgundy/50 hover:bg-aura-paper [&>*]:flex [&>*]:items-center [&>*]:gap-2",
        className
      )}
    >
      <div>
        <span className={cn('relative inline-block rounded-full p-1.5', iconClassName)}>
          {icon}
        </span>
        <p className={cn('text-lg font-medium', titleClassName)}>{title}</p>
      </div>
      <p className="whitespace-nowrap text-base text-aura-burgundy/70">{description}</p>
      <p className="text-xs uppercase tracking-wide text-aura-terracotta">{date}</p>
    </div>
  )
}

interface DisplayCardsProps {
  cards?: DisplayCardProps[]
  className?: string
}

export default function DisplayCards({ cards, className }: DisplayCardsProps) {
  const defaultCards: DisplayCardProps[] = [
    {
      className:
        "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-aura-cream/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
    },
    {
      className:
        "[grid-area:stack] translate-x-16 translate-y-10 hover:-translate-y-1 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-aura-cream/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
    },
    {
      className: '[grid-area:stack] translate-x-32 translate-y-20 hover:translate-y-10',
    },
  ]

  const displayCards = cards || defaultCards

  return (
    <div
      className={cn(
        "grid [grid-template-areas:'stack'] place-items-center opacity-100 animate-in fade-in-0 duration-700",
        className
      )}
    >
      {displayCards.map((cardProps, index) => (
        <DisplayCard key={index} {...cardProps} />
      ))}
    </div>
  )
}
