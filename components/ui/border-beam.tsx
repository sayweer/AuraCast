'use client'

import React, { CSSProperties, useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

import { cn } from '@/lib/utils'

// Infinite animation — keep to max ~2 instances per visible screen.
// Host element needs `relative overflow-hidden` and a border radius.
interface BorderBeamProps {
  lightWidth?: number
  duration?: number
  lightColor?: string
  borderWidth?: number
  className?: string
}

export function BorderBeam({
  lightWidth = 200,
  duration = 10,
  lightColor = '#FAFAFA',
  borderWidth = 1,
  className,
}: BorderBeamProps) {
  const pathRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()

  const updatePath = () => {
    if (pathRef.current) {
      const div = pathRef.current
      div.style.setProperty(
        '--path',
        `path("M 0 0 H ${div.offsetWidth} V ${div.offsetHeight} H 0 V 0")`
      )
    }
  }

  useEffect(() => {
    updatePath()
    window.addEventListener('resize', updatePath)

    return () => {
      window.removeEventListener('resize', updatePath)
    }
  }, [])

  if (reducedMotion) return null

  return (
    <div
      style={
        {
          '--duration': duration,
          '--border-width': `${borderWidth}px`,
        } as CSSProperties
      }
      ref={pathRef}
      className={cn(
        `absolute z-0 h-full w-full rounded-[inherit]`,
        `after:absolute after:inset-[var(--border-width)] after:rounded-[inherit] after:content-['']`,
        'border-[length:var(--border-width)] ![mask-clip:padding-box,border-box]',
        '![mask-composite:intersect] [mask:linear-gradient(transparent,transparent),linear-gradient(red,red)]',
        `before:absolute before:inset-0 before:z-[-1] before:rounded-[inherit] before:border-[length:var(--border-width)] before:border-black/10 dark:before:border-white/10`,
        className
      )}
    >
      <motion.div
        className="absolute inset-0 aspect-square bg-[radial-gradient(ellipse_at_center,var(--light-color),transparent,transparent)]"
        style={
          {
            '--light-color': lightColor,
            '--light-width': `${lightWidth}px`,
            width: 'var(--light-width)',
            offsetPath: 'var(--path)',
          } as CSSProperties
        }
        animate={{
          offsetDistance: ['0%', '100%'],
        }}
        transition={{
          duration: duration,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </div>
  )
}
