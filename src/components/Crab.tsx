import { brand } from '@/config/brand';

/** Decorative crab. Hidden from assistive tech so it does not repeat in every heading. */
export function Crab({ className = '' }: { className?: string }) {
  return (
    <span className={className ? `crab ${className}` : 'crab'} aria-hidden="true">
      {brand.mark}
    </span>
  );
}
