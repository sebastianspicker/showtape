'use client';

import { Button } from '@repo/ui';

export interface MatchingBulkActionsProps {
  loading: boolean;
  onAutoMatchAll: () => void;
  onSkipUnmatched: () => void;
  onReset: () => void;
}

export function MatchingBulkActions({
  loading,
  onAutoMatchAll,
  onSkipUnmatched,
  onReset,
}: MatchingBulkActionsProps) {
  return (
    <div className="matching-actions">
      <Button
        type="button"
        onClick={onAutoMatchAll}
        loading={loading}
        loadingChildren="Re-matching…"
        variant="secondary"
      >
        Re-match all
      </Button>
      <Button type="button" onClick={onSkipUnmatched} variant="secondary">
        Skip unmatched songs
      </Button>
      <Button type="button" onClick={onReset} variant="secondary">
        Start over
      </Button>
    </div>
  );
}
