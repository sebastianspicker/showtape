'use client';

import { Button } from '@repo/ui';

export interface MatchingBulkActionsProps {
  loading: boolean;
  onAutoMatchAll: () => void;
  onSkipUnmatched: () => void;
}

export function MatchingBulkActions({
  loading,
  onAutoMatchAll,
  onSkipUnmatched,
}: MatchingBulkActionsProps) {
  return (
    <div className="matching-actions" role="group" aria-label="Bulk matching actions">
      <Button
        type="button"
        onClick={onAutoMatchAll}
        loading={loading}
        loadingChildren="Re-matching…"
        variant="secondary"
      >
        Re-match all
      </Button>
      <Button type="button" onClick={onSkipUnmatched} variant="secondary" disabled={loading}>
        Skip remaining
      </Button>
    </div>
  );
}
