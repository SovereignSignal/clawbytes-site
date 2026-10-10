/** Pixel rule with a center diamond. Decorative. */
export function PixelDivider({ className = '' }: { className?: string }) {
  return (
    <div className={className ? `pixel-divider-row ${className}` : 'pixel-divider-row'} aria-hidden="true">
      <div className="pixel-divider" />
      <svg width="16" height="16" viewBox="0 0 8 8" style={{ imageRendering: 'pixelated' }}>
        <rect x={3} y={0} width={2} height={1} fill="hsl(var(--primary))" />
        <rect x={2} y={1} width={4} height={1} fill="hsl(var(--primary))" />
        <rect x={1} y={2} width={6} height={1} fill="hsl(var(--primary))" />
        <rect x={0} y={3} width={8} height={2} fill="hsl(var(--primary))" />
        <rect x={1} y={5} width={6} height={1} fill="hsl(var(--primary))" />
        <rect x={2} y={6} width={4} height={1} fill="hsl(var(--primary))" />
        <rect x={3} y={7} width={2} height={1} fill="hsl(var(--primary))" />
      </svg>
      <div className="pixel-divider" />
    </div>
  );
}
