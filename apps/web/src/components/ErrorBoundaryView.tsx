'use client';

export interface ErrorBoundaryViewProps {
  message: string;
  onReset: () => void;
  /** Accessible label for the reset button. Default: "Try again" */
  resetLabel?: string;
}

export function ErrorBoundaryView({
  message,
  onReset,
  resetLabel = 'Try again',
}: ErrorBoundaryViewProps) {
  return (
    <main id="main" className="main-content prose-page" tabIndex={-1}>
      <h1>Something went wrong</h1>
      <p role="alert" className="support-text">
        {message || 'An error occurred. You can try again.'}
      </p>
      <button
        type="button"
        onClick={onReset}
        aria-label={resetLabel}
        className="button button--primary"
      >
        {resetLabel}
      </button>
    </main>
  );
}
