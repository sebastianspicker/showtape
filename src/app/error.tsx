'use client';

import { useEffect } from 'react';
import { getErrorMessage } from '@/ui/error-message';
import { ErrorBoundaryView } from '@/ui/ErrorBoundaryView';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error(error);
    }
  }, [error]);

  const message = getErrorMessage(error, 'An error occurred. You can try again.');

  return <ErrorBoundaryView message={message} onReset={reset} />;
}
