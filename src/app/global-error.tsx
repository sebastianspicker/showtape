'use client';

import { getErrorMessage } from '@/ui/error-message';
import { ErrorBoundaryView } from '@/ui/ErrorBoundaryView';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const message = getErrorMessage(error, 'An unexpected error occurred. You can try again.');

  return (
    <html lang="en">
      <body>
        <ErrorBoundaryView message={message} onReset={reset} />
      </body>
    </html>
  );
}
