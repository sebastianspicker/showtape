'use client';

export interface StatusTextProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Accessible status message for loading and progress updates.
 * Uses role="status" and aria-live="polite" so assistive tech announces changes.
 */
export function StatusText({ children, className }: StatusTextProps) {
  return (
    <p
      role="status"
      aria-live="polite"
      className={['status-text', className].filter(Boolean).join(' ')}
    >
      {children}
    </p>
  );
}
