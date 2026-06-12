import { cn } from '@/lib/utils'

interface NewsMarqueeProps {
  images: string[]
  className?: string
}

const COLUMN_STYLES = [
  { animation: 'news-scroll-up 60s linear infinite', extra: '' },
  { animation: 'news-scroll-down 72s linear infinite', extra: '' },
  { animation: 'news-scroll-up 55s linear infinite', extra: 'hidden sm:flex' },
  { animation: 'news-scroll-down 65s linear infinite', extra: 'hidden lg:flex' },
]

/** Diagonal infinite-scrolling wall of newspaper front pages — pure CSS animation. */
export default function NewsMarquee({ images, className }: NewsMarqueeProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'absolute inset-0 overflow-hidden pointer-events-none select-none',
        className
      )}
    >
      {/* Oversized rotated canvas so corners stay covered */}
      <div className="absolute w-[150%] h-[170%] -left-[25%] -top-[35%] -rotate-12 opacity-30 flex justify-center gap-6">
        {COLUMN_STYLES.map((col, colIndex) => {
          // Offset each column's starting image so neighbours never repeat side by side
          const rotated = images.map(
            (_, i) => images[(i + colIndex * 2) % images.length]
          )
          const looped = [...rotated, ...rotated]
          return (
            <div
              key={colIndex}
              className={cn(
                'news-column flex flex-col gap-6 will-change-transform',
                col.extra
              )}
              style={{ animation: col.animation }}
            >
              {looped.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  width={600}
                  height={750}
                  loading="lazy"
                  decoding="async"
                  className="w-44 sm:w-56 rounded-md sepia-[0.25]"
                />
              ))}
            </div>
          )
        })}
      </div>

      {/* Edge masks — melt the wall into the cream paper */}
      <div className="absolute inset-0 bg-gradient-to-b from-aura-cream via-transparent to-aura-cream" />
      <div className="absolute inset-0 bg-gradient-to-r from-aura-cream via-transparent to-aura-cream" />
      {/* Central wash behind the masthead so type stays legible */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_45%,#EEE0CC_0%,rgba(238,224,204,0.6)_45%,transparent_75%)]" />
    </div>
  )
}
