'use client';

function isLikelyNetworkError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('load failed') ||
    lower.includes('network request failed')
  );
}

export interface ErrorAlertProps {
  message: string;
  onRetry?: () => void;
  /** Accessible label for the retry button. Default: "Try again" */
  retryLabel?: string;
}

export function ErrorAlert({ message, onRetry, retryLabel = 'Try again' }: ErrorAlertProps) {
  const showOfflineHint = isLikelyNetworkError(message);
  return (
    <div role="alert" className="error-alert">
      <p>{message}</p>
      {showOfflineHint && (
        <p className="error-alert__hint">Offline? Check your connection and try again.</p>
      )}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          aria-label={retryLabel}
          className="button button--secondary button--compact"
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
