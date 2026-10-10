'use client';

import { useEffect, useRef } from 'react';
import { parallaxShift } from '@/lib/motion';

const TREES = [20, 55, 90, 130, 170, 210, 255, 300, 345, 390, 430, 475, 520, 560, 610, 650, 695, 740];

/**
 * Fixed shore behind the page. It drifts a little on scroll, and stays put
 * when the reader asks for reduced motion.
 */
export function PNWParallaxBg() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;

    const paint = () => {
      frame = 0;
      const shift = parallaxShift(window.scrollY, media.matches);
      node.style.transform = shift === 0 ? 'none' : `translate3d(0, ${shift.toFixed(1)}px, 0)`;
    };

    const onScroll = () => {
      if (media.matches || frame) return;
      frame = window.requestAnimationFrame(paint);
    };

    const onMotion = () => {
      window.removeEventListener('scroll', onScroll);
      if (!media.matches) window.addEventListener('scroll', onScroll, { passive: true });
      paint();
    };

    onMotion();
    media.addEventListener('change', onMotion);
    return () => {
      window.removeEventListener('scroll', onScroll);
      media.removeEventListener('change', onMotion);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} className="pnw-bg" aria-hidden="true">
      <svg className="pnw-svg" viewBox="0 0 800 360" preserveAspectRatio="xMidYMax slice">
        <polygon points="0,250 70,150 130,220 190,130 270,210 350,120 430,200 510,150 590,215 670,165 750,205 800,170 800,360 0,360" fill="hsl(var(--muted-foreground))" opacity="0.08" />
        <polygon points="175,142 180,130 185,142" fill="hsl(var(--foreground))" opacity="0.12" />
        <polygon points="345,132 350,120 355,132" fill="hsl(var(--foreground))" opacity="0.12" />
        <polygon points="0,290 90,200 170,260 250,185 340,255 420,195 500,250 580,205 660,255 740,215 800,245 800,360 0,360" fill="hsl(var(--muted-foreground))" opacity="0.1" />
        <polygon points="0,320 110,270 210,305 310,260 410,295 510,265 610,300 710,275 800,305 800,360 0,360" fill="hsl(var(--secondary))" opacity="0.12" />
        <g>
          {TREES.map((x, index) => {
            const height = 16 + (index % 3) * 5;
            const base = 300 - (index % 4) * 6;
            return (
              <polygon
                key={x}
                points={`${x},${base} ${x + height / 2},${base - height} ${x + height},${base}`}
                fill="hsl(var(--secondary))"
                opacity={0.16 + (index % 3) * 0.04}
              />
            );
          })}
        </g>
        <rect x={0} y={318} width={800} height={22} fill="hsl(var(--primary))" opacity="0.06" />
        <rect x={0} y={338} width={800} height={22} fill="hsl(var(--accent))" opacity="0.08" />
      </svg>
    </div>
  );
}
