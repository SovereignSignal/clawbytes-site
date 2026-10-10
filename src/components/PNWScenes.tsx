/** Pacific Northwest pixel scenery. Positions are fixed so server and client markup match. */

export function PixelTree({ x = 0, opacity = 0.2 }: { x?: number; opacity?: number }) {
  return (
    <g opacity={opacity} transform={`translate(${x}, 0)`}>
      <rect x={3} y={0} width={2} height={1} fill="hsl(var(--secondary))" />
      <rect x={2} y={1} width={4} height={1} fill="hsl(var(--secondary))" />
      <rect x={1} y={2} width={6} height={1} fill="hsl(var(--secondary))" />
      <rect x={2} y={3} width={4} height={1} fill="hsl(var(--secondary))" />
      <rect x={1} y={4} width={6} height={1} fill="hsl(var(--secondary))" />
      <rect x={0} y={5} width={8} height={1} fill="hsl(var(--secondary))" />
      <rect x={1} y={6} width={6} height={1} fill="hsl(var(--secondary))" />
      <rect x={0} y={7} width={8} height={1} fill="hsl(var(--secondary))" />
      <rect x={3} y={8} width={2} height={4} fill="hsl(var(--muted-foreground))" />
    </g>
  );
}

const TREES = [4, 18, 36, 52, 72, 88, 108, 124, 140, 158, 176, 190];

export function PixelTreeline({ className = '' }: { className?: string }) {
  return (
    <svg className={`scene-wide ${className}`} viewBox="0 0 200 16" preserveAspectRatio="none" aria-hidden="true">
      {TREES.map((x, index) => (
        <PixelTree key={x} x={x} opacity={index % 3 === 0 ? 0.3 : index % 2 === 0 ? 0.22 : 0.14} />
      ))}
    </svg>
  );
}

export function PixelMountains({ className = '' }: { className?: string }) {
  return (
    <svg className={`scene-wide ${className}`} viewBox="0 0 400 80" preserveAspectRatio="none" aria-hidden="true">
      <polygon points="0,80 40,25 80,80" fill="hsl(var(--muted-foreground))" opacity="0.14" />
      <polygon points="60,80 120,10 180,80" fill="hsl(var(--muted-foreground))" opacity="0.1" />
      <polygon points="150,80 210,20 270,80" fill="hsl(var(--muted-foreground))" opacity="0.14" />
      <polygon points="240,80 300,15 360,80" fill="hsl(var(--muted-foreground))" opacity="0.1" />
      <polygon points="320,80 370,30 400,80" fill="hsl(var(--muted-foreground))" opacity="0.14" />
      <polygon points="115,18 120,10 125,18" fill="hsl(var(--foreground))" opacity="0.16" />
      <polygon points="295,22 300,15 305,22" fill="hsl(var(--foreground))" opacity="0.16" />
    </svg>
  );
}

export function PixelWaves({ className = '' }: { className?: string }) {
  return (
    <svg className={`scene-wide ${className}`} viewBox="0 0 400 16" preserveAspectRatio="none" aria-hidden="true">
      <rect x={0} y={10} width={400} height={6} fill="hsl(var(--accent))" opacity="0.28" />
      <rect x={10} y={6} width={12} height={3} fill="hsl(var(--primary))" opacity="0.35" />
      <rect x={50} y={4} width={16} height={3} fill="hsl(var(--primary))" opacity="0.28" />
      <rect x={100} y={6} width={12} height={3} fill="hsl(var(--primary))" opacity="0.35" />
      <rect x={150} y={5} width={14} height={3} fill="hsl(var(--primary))" opacity="0.28" />
      <rect x={210} y={6} width={12} height={3} fill="hsl(var(--primary))" opacity="0.35" />
      <rect x={260} y={4} width={16} height={3} fill="hsl(var(--primary))" opacity="0.28" />
      <rect x={320} y={6} width={12} height={3} fill="hsl(var(--primary))" opacity="0.35" />
      <rect x={370} y={5} width={14} height={3} fill="hsl(var(--primary))" opacity="0.28" />
    </svg>
  );
}

function PixelFernMark() {
  return (
    <g>
      <rect x={3} y={0} width={2} height={1} fill="hsl(var(--secondary))" />
      <rect x={2} y={1} width={1} height={1} fill="hsl(var(--secondary))" />
      <rect x={5} y={1} width={1} height={1} fill="hsl(var(--secondary))" />
      <rect x={1} y={2} width={1} height={1} fill="hsl(var(--secondary))" />
      <rect x={3} y={2} width={2} height={1} fill="hsl(var(--secondary))" />
      <rect x={6} y={2} width={1} height={1} fill="hsl(var(--secondary))" />
      <rect x={3} y={3} width={2} height={6} fill="hsl(var(--secondary))" />
    </g>
  );
}

export function PixelFern({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="32" height="40" viewBox="0 0 8 10" aria-hidden="true">
      <rect x={3} y={0} width={2} height={1} fill="hsl(var(--secondary))" />
      <rect x={2} y={1} width={1} height={1} fill="hsl(var(--secondary))" />
      <rect x={5} y={1} width={1} height={1} fill="hsl(var(--secondary))" />
      <rect x={1} y={2} width={1} height={1} fill="hsl(var(--secondary))" />
      <rect x={3} y={2} width={2} height={1} fill="hsl(var(--secondary))" />
      <rect x={6} y={2} width={1} height={1} fill="hsl(var(--secondary))" />
      <rect x={0} y={3} width={1} height={1} fill="hsl(var(--secondary))" />
      <rect x={3} y={3} width={2} height={1} fill="hsl(var(--secondary))" />
      <rect x={7} y={3} width={1} height={1} fill="hsl(var(--secondary))" />
      <rect x={3} y={4} width={2} height={6} fill="hsl(var(--secondary))" />
    </svg>
  );
}

/** Shore strip for the home hero, with a crab on the sand. */
export function HeroShore() {
  return (
    <svg className="hero-shore" viewBox="0 0 800 150" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <polygon points="0,90 70,28 140,78 210,18 290,70 370,24 460,74 540,30 620,68 700,36 800,72 800,150 0,150" fill="hsl(var(--muted-foreground))" opacity="0.16" />
      <polygon points="0,108 90,62 180,100 270,58 360,96 450,64 540,100 640,70 740,98 800,78 800,150 0,150" fill="hsl(var(--secondary))" opacity="0.2" />
      <g opacity="0.85">
        <g transform="translate(28,62) scale(3.1)"><PixelTree opacity={1} /></g>
        <g transform="translate(70,74) scale(2.4)"><PixelTree opacity={0.75} /></g>
        <g transform="translate(210,68) scale(2.8)"><PixelTree opacity={0.9} /></g>
        <g transform="translate(470,70) scale(2.6)"><PixelTree opacity={0.8} /></g>
        <g transform="translate(560,78) scale(2.2)"><PixelTree opacity={0.65} /></g>
      </g>
      <g transform="translate(18,96) scale(2.2)" opacity="0.7">
        <PixelFernMark />
      </g>
      <rect x={0} y={118} width={800} height={14} fill="hsl(var(--primary))" opacity="0.18" />
      <rect x={24} y={116} width={28} height={3} fill="hsl(var(--primary))" opacity="0.45" />
      <rect x={120} y={120} width={36} height={3} fill="hsl(var(--primary))" opacity="0.35" />
      <rect x={250} y={117} width={22} height={3} fill="hsl(var(--primary))" opacity="0.4" />
      <rect x={410} y={121} width={40} height={3} fill="hsl(var(--primary))" opacity="0.35" />
      <rect x={560} y={116} width={26} height={3} fill="hsl(var(--primary))" opacity="0.45" />
      <rect x={700} y={120} width={34} height={3} fill="hsl(var(--primary))" opacity="0.35" />
      <rect x={0} y={132} width={800} height={18} fill="hsl(var(--accent))" opacity="0.45" />
      <g transform="translate(620,78) scale(1.7)" className="shore-crab">
        <rect x={8} y={0} width={6} height={2} fill="hsl(var(--primary))" />
        <rect x={28} y={0} width={6} height={2} fill="hsl(var(--primary))" />
        <rect x={4} y={2} width={12} height={4} fill="hsl(var(--primary))" />
        <rect x={26} y={2} width={12} height={4} fill="hsl(var(--primary))" />
        <rect x={10} y={8} width={22} height={8} fill="hsl(var(--primary))" />
        <rect x={14} y={10} width={3} height={3} fill="hsl(var(--foreground))" />
        <rect x={25} y={10} width={3} height={3} fill="hsl(var(--foreground))" />
        <rect x={12} y={16} width={3} height={5} fill="hsl(var(--primary))" />
        <rect x={20} y={16} width={3} height={6} fill="hsl(var(--primary))" />
        <rect x={28} y={16} width={3} height={5} fill="hsl(var(--primary))" />
      </g>
    </svg>
  );
}
