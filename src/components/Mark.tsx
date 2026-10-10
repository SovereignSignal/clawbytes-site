export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg className="mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="4" fill="currentColor" />
      <path d="M7 23c4-2 6-8 9-14 3 6 5 12 9 14" fill="none" stroke="var(--paper)" strokeWidth="2" />
    </svg>
  );
}
