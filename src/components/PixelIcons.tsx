/**
 * Inline SVG pixel-art icons. No image files.
 * Cell 1 uses the current fill. Cell 2 uses claw red.
 */

interface PixelIconProps {
  className?: string;
  size?: number;
}

function pixelGrid(pixels: number[][], color: string, size: number, className?: string) {
  const width = pixels[0]?.length ?? 0;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${width} ${pixels.length}`}
      className={className ? `pixel-icon ${className}` : 'pixel-icon'}
      style={{ imageRendering: 'pixelated' }}
      aria-hidden="true"
    >
      {pixels.map((row, y) =>
        row.map((cell, x) =>
          cell ? (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={1}
              height={1}
              fill={cell === 2 ? 'hsl(var(--primary))' : cell === 3 ? 'hsl(var(--foreground))' : color}
            />
          ) : null,
        ),
      )}
    </svg>
  );
}

export const IconDiscover = ({ size = 32, className }: PixelIconProps) =>
  pixelGrid(
    [
      [0, 0, 0, 1, 1, 1, 0, 0],
      [0, 0, 1, 0, 0, 0, 1, 0],
      [0, 1, 0, 0, 0, 0, 0, 1],
      [0, 1, 0, 0, 0, 0, 0, 1],
      [0, 1, 0, 0, 0, 0, 0, 1],
      [0, 0, 1, 0, 0, 0, 1, 0],
      [0, 0, 0, 1, 1, 2, 0, 0],
      [0, 0, 0, 0, 0, 0, 2, 0],
    ],
    'hsl(var(--foreground))',
    size,
    className,
  );

export const IconClaw = ({ size = 32, className }: PixelIconProps) =>
  pixelGrid(
    [
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0],
      [0, 0, 0, 0, 0, 0, 2, 2, 0, 2, 2, 0],
      [0, 0, 0, 0, 0, 0, 2, 2, 0, 2, 2, 0],
      [0, 0, 0, 2, 2, 0, 2, 2, 0, 2, 2, 0],
      [0, 1, 0, 2, 2, 0, 2, 2, 0, 2, 2, 0],
      [0, 1, 0, 2, 2, 0, 2, 2, 0, 2, 2, 0],
      [0, 1, 0, 2, 2, 0, 2, 2, 0, 2, 2, 0],
      [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
    'hsl(var(--foreground))',
    size,
    className,
  );

export const IconTech = ({ size = 32, className }: PixelIconProps) =>
  pixelGrid(
    [
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 2, 0, 0, 0, 0, 1],
      [1, 0, 0, 2, 0, 0, 0, 1],
      [1, 0, 2, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
    ],
    'hsl(var(--foreground))',
    size,
    className,
  );

export const IconRadar = ({ size = 32, className }: PixelIconProps) =>
  pixelGrid(
    [
      [0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0],
      [0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0],
      [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
      [1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 1],
      [1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 0, 0, 2, 2, 0, 0, 1, 0, 1],
      [1, 0, 1, 0, 0, 2, 2, 0, 0, 1, 0, 1],
      [1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1],
      [1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 1],
      [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
      [0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0],
      [0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0],
    ],
    'hsl(var(--foreground))',
    size,
    className,
  );

export function PixelDiamond({ className = '' }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 4 4" className={className} style={{ imageRendering: 'pixelated' }} aria-hidden="true">
      <rect x={1} y={0} width={2} height={1} fill="hsl(var(--primary))" />
      <rect x={0} y={1} width={4} height={2} fill="hsl(var(--primary))" />
      <rect x={1} y={3} width={2} height={1} fill="hsl(var(--primary))" />
    </svg>
  );
}
