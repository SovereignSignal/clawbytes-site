import { Crab } from '@/components/Crab';

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="empty">
      <Crab /> {children}
    </p>
  );
}
