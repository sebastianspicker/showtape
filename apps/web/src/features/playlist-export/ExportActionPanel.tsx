'use client';

import { Button } from '@repo/ui';
import { ErrorAlert } from '@/components/ErrorAlert';
import { ConnectAppleMusic } from '@/features/matching/ConnectAppleMusic';

export interface ExportActionPanelProps {
  needsAuth: boolean;
  dedupeTracks: boolean;
  setDedupeTracks: (value: boolean) => void;
  dedupeSavings: number;
  count: number;
  loading: boolean;
  error: string | null;
  onCreate: () => void;
  onAuthorized: () => void;
}

export function ExportActionPanel({
  needsAuth,
  dedupeTracks,
  setDedupeTracks,
  dedupeSavings,
  count,
  loading,
  error,
  onCreate,
  onAuthorized,
}: ExportActionPanelProps) {
  return (
    <section className="export-action-panel" aria-label="Apple Music playlist creation">
      <p className="export-service">Apple Music</p>
      <div className="connection-status">
        <span className="connection-status__label">Connection</span>
        <strong>{needsAuth ? 'Not connected' : 'Connected'}</strong>
      </div>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={dedupeTracks}
          onChange={(event) => setDedupeTracks(event.target.checked)}
        />
        <span>
          <strong>Remove duplicate songs</strong>
          <small>
            {dedupeTracks && dedupeSavings > 0
              ? `${dedupeSavings} duplicate song${dedupeSavings === 1 ? '' : 's'} will be removed.`
              : 'No duplicates found in the current selection.'}
          </small>
        </span>
      </label>

      <div className="mutation-note">
        <span className="mutation-note__icon" aria-hidden="true">
          ↗
        </span>
        <div>
          <h3>Before you continue</h3>
          <p>
            This creates one playlist in your Apple Music library. If Apple Music cannot confirm the
            result, inspect your library before trying again.
          </p>
        </div>
      </div>

      {needsAuth ? (
        <ConnectAppleMusic
          onAuthorized={onAuthorized}
          label="Connect Apple Music and create playlist"
        />
      ) : (
        <Button
          onClick={onCreate}
          disabled={count === 0}
          loading={loading}
          loadingChildren="Creating playlist…"
          className="export-create"
        >
          Create playlist
        </Button>
      )}

      {error ? (
        <ErrorAlert
          message={error}
          onRetry={() => void onCreate()}
          retryLabel="Retry create playlist"
        />
      ) : null}
    </section>
  );
}
