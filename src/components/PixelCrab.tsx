import type { ReactElement } from 'react';

/**
 * One front-facing pixel crab, drawn at whatever size the caller needs.
 * Claw red, a darker shade, and sand eyes. icon.svg uses the same cells.
 */
export const CRAB_ART = [
  '.RR..............RR.',
  'R..R............R..R',
  'R..R............R..R',
  '.RRR............RRR.',
  '..R..............R..',
  '..R..............R..',
  '..R..EE......EE..R..',
  '..R..ED......DE..R..',
  '..R..RR......RR..R..',
  '..R..RR......RR..R..',
  '..RRRRRRRRRRRRRRRR..',
  '...RRRRRRRRRRRRRR...',
  '..RRRRRRRRRRRRRRRR..',
  '..RRRRRRRRRRRRRRRR..',
  '...RRRRRRRRRRRRRR...',
  '....DDDDDDDDDDDD....',
  '..R.R.R......R.R.R..',
  '.R.R.R........R.R.R.',
  'R.R.R..........R.R.R',
] as const;

const FILL = {
  R: 'hsl(var(--primary))',
  D: 'hsl(var(--crab-shade))',
  E: 'hsl(var(--crab-eye))',
} as const;

export const CRAB_WIDTH = CRAB_ART[0].length;
export const CRAB_HEIGHT = CRAB_ART.length;

function cells() {
  const rects: ReactElement[] = [];
  CRAB_ART.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      if (cell !== 'R' && cell !== 'D' && cell !== 'E') return;
      rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={FILL[cell]} />);
    });
  });
  return rects;
}

export function PixelCrab({
  size = 40,
  className = '',
  inline = false,
}: {
  size?: number;
  className?: string;
  /** Draw into a parent svg instead of wrapping a new one. */
  inline?: boolean;
}) {
  const rects = cells();
  if (inline) {
    return (
      <g className={className || undefined} shapeRendering="crispEdges">
        {rects}
      </g>
    );
  }
  const height = Math.round((size * CRAB_HEIGHT) / CRAB_WIDTH);
  return (
    <svg
      width={size}
      height={height}
      viewBox={`0 0 ${CRAB_WIDTH} ${CRAB_HEIGHT}`}
      className={className ? `pixel-crab ${className}` : 'pixel-crab'}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {rects}
    </svg>
  );
}
