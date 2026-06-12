'use client';
import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

type WavePathProps = React.ComponentProps<'div'>;

export function WavePath({ className, ...props }: WavePathProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const path = useRef<SVGPathElement>(null);
    const progress = useRef(0);
    const x = useRef(0.2);
    const time = useRef(Math.PI / 2);
    const reqId = useRef<number | null>(null);

    const setPath = (p: number) => {
        const width = containerRef.current?.clientWidth ?? 0;
        if (path.current) {
            path.current.setAttributeNS(
                null,
                'd',
                `M0 100 Q${width * x.current} ${100 + p * 0.6}, ${width} 100`,
            );
        }
    };

    useEffect(() => {
        setPath(progress.current);
        const onResize = () => setPath(progress.current);
        window.addEventListener('resize', onResize);
        return () => {
            window.removeEventListener('resize', onResize);
            if (reqId.current) cancelAnimationFrame(reqId.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const lerp = (a: number, b: number, t: number) => a * (1 - t) + b * t;

    const manageMouseEnter = () => {
        if (reqId.current) {
            cancelAnimationFrame(reqId.current);
            resetAnimation();
        }
    };

    const manageMouseMove = (e: React.MouseEvent) => {
        const { movementY, clientX } = e;
        if (path.current) {
            const pathBound = path.current.getBoundingClientRect();
            x.current = (clientX - pathBound.left) / pathBound.width;
            progress.current += movementY;
            setPath(progress.current);
        }
    };

    const manageMouseLeave = () => {
        animateOut();
    };

    const animateOut = () => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setPath(0);
            resetAnimation();
            return;
        }
        const newProgress = progress.current * Math.sin(time.current);
        progress.current = lerp(progress.current, 0, 0.025);
        time.current += 0.2;
        setPath(newProgress);
        if (Math.abs(progress.current) > 0.75) {
            reqId.current = requestAnimationFrame(animateOut);
        } else {
            resetAnimation();
        }
    };

    const resetAnimation = () => {
        time.current = Math.PI / 2;
        progress.current = 0;
    };

    return (
        <div ref={containerRef} className={cn('relative h-px w-full', className)} {...props}>
            <div
                onMouseEnter={manageMouseEnter}
                onMouseMove={manageMouseMove}
                onMouseLeave={manageMouseLeave}
                className="relative -top-5 z-10 h-10 w-full hover:-top-[150px] hover:h-[300px]"
            />
            <svg className="pointer-events-none absolute -top-[100px] h-[300px] w-full">
                <path ref={path} className="fill-none stroke-current" strokeWidth={2} />
            </svg>
        </div>
    );
}
