'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useTransform,
} from 'framer-motion';
import { Check, ChevronsRight, Loader2, X } from 'lucide-react';

import { cn } from '@/lib/utils';

const DRAG_THRESHOLD = 0.9;
const HANDLE_SIZE = 40; // px — matches h-10 w-10
const TRACK_PAD = 4; // px — matches left-1 / right-1
const SPRING = { type: 'spring' as const, stiffness: 400, damping: 40, mass: 0.8 };

type Status = 'idle' | 'loading' | 'success' | 'error';

const COLORS = {
  burgundy: { track: 'bg-aura-burgundy', icon: 'text-aura-burgundy' },
  olive: { track: 'bg-aura-olive', icon: 'text-aura-olive' },
} as const;

interface SlideButtonProps {
  label: string;
  onConfirm: () => void | Promise<void>;
  color?: keyof typeof COLORS;
  disabled?: boolean;
  className?: string;
}

export function SlideButton({
  label,
  onConfirm,
  color = 'burgundy',
  disabled = false,
  className,
}: SlideButtonProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [maxX, setMaxX] = useState(0);
  const [status, setStatus] = useState<Status>('idle');
  const [completed, setCompleted] = useState(false);

  const x = useMotionValue(0);
  const progress = useTransform(x, [0, Math.max(maxX, 1)], [0, 1]);
  const labelOpacity = useTransform(progress, [0, 0.55], [1, 0]);

  // Measure the draggable range from the track's actual width (responsive).
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const update = () =>
      setMaxX(Math.max(track.offsetWidth - HANDLE_SIZE - TRACK_PAD * 2, 1));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(track);
    return () => ro.disconnect();
  }, []);

  const colors = COLORS[color];
  const interactive = !disabled && !completed && status === 'idle';

  const runConfirm = async () => {
    try {
      const result = onConfirm();
      if (result instanceof Promise) {
        setStatus('loading');
        await result;
      }
      setStatus('success');
    } catch {
      setStatus('error');
      setTimeout(() => {
        setStatus('idle');
        setCompleted(false);
        animate(x, 0, SPRING);
      }, 1500);
    }
  };

  const handleDragEnd = () => {
    if (!interactive) return;
    if (x.get() >= maxX * DRAG_THRESHOLD) {
      setCompleted(true);
      animate(x, maxX, SPRING);
      void runConfirm();
    } else {
      animate(x, 0, SPRING);
    }
  };

  const statusIcon: Record<Status, JSX.Element> = {
    idle: <ChevronsRight className="size-5" />,
    loading: <Loader2 className="size-5 animate-spin" />,
    success: <Check className="size-5" />,
    error: <X className="size-5" />,
  };

  return (
    <div
      ref={trackRef}
      className={cn(
        'relative flex h-12 w-full items-center justify-center overflow-hidden rounded-full select-none',
        colors.track,
        disabled && 'opacity-50',
        className,
      )}
    >
      <motion.span
        style={{ opacity: labelOpacity }}
        className="pointer-events-none px-12 text-sm font-semibold text-aura-cream"
      >
        {label}
      </motion.span>

      <motion.div
        drag={interactive ? 'x' : false}
        dragConstraints={{ left: 0, right: maxX }}
        dragElastic={0.05}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className={cn(
          'absolute left-1 flex size-10 items-center justify-center rounded-full bg-aura-cream shadow-md',
          colors.icon,
          interactive && 'cursor-grab active:cursor-grabbing',
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={status}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.15 }}
          >
            {statusIcon[status]}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
