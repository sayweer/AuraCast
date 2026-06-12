'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

export interface DockItem {
  id: string
  icon: LucideIcon
  label: string
  onClick?: () => void
}

interface DockProps {
  className?: string
  items: DockItem[]
  activeId?: string
}

interface DockIconButtonProps {
  icon: LucideIcon
  label: string
  active?: boolean
  onClick?: () => void
  className?: string
}

const floatingAnimation = {
  initial: { y: 0 },
  animate: {
    y: [-2, 2, -2],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

const DockIconButton = React.forwardRef<HTMLButtonElement, DockIconButtonProps>(
  ({ icon: Icon, label, active = false, onClick, className }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.1, y: -2 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        aria-label={label}
        aria-pressed={active}
        className={cn(
          'relative group p-3 rounded-xl transition-colors',
          active
            ? 'bg-aura-cream text-aura-night shadow-md'
            : 'text-aura-cream/85 hover:bg-aura-cream/15',
          className
        )}
      >
        <Icon className="w-5 h-5" />
        <span
          className={cn(
            'absolute top-full mt-2 left-1/2 -translate-x-1/2',
            'px-2 py-1 rounded-md text-xs font-semibold',
            'bg-aura-night text-aura-cream',
            'opacity-0 group-hover:opacity-100',
            'transition-opacity whitespace-nowrap pointer-events-none'
          )}
        >
          {label}
        </span>
      </motion.button>
    )
  }
)
DockIconButton.displayName = 'DockIconButton'

const Dock = React.forwardRef<HTMLDivElement, DockProps>(
  ({ items, activeId, className }, ref) => {
    return (
      <div ref={ref} className={cn('flex items-center justify-center', className)}>
        <motion.div
          initial="initial"
          animate="animate"
          variants={floatingAnimation}
          className={cn(
            'flex items-center gap-1 p-1.5 rounded-2xl',
            'backdrop-blur-lg border shadow-lg',
            'bg-aura-night/15 border-aura-cream/20',
            'hover:shadow-xl transition-shadow duration-300'
          )}
        >
          {items.map(({ id, ...item }) => (
            <DockIconButton key={id} active={id === activeId} {...item} />
          ))}
        </motion.div>
      </div>
    )
  }
)
Dock.displayName = 'Dock'

export { Dock }
