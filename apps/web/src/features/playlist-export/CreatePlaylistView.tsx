'use client';

import { useMemo } from 'react';
import { Button } from '@repo/ui';
import type { Setlist } from '@repo/core';
import type { MatchRow } from '@/features/matching/types';
import { ErrorAlert } from '@/components/ErrorAlert';
import { ConnectAppleMusic } from '@/features/matching/ConnectAppleMusic';
import { useCreatePlaylistState } from './useCreatePlaylistState';

export interface CreatePlaylistViewProps {
  setlist: Setlist;
  matchRows: MatchRow[];
  onBack?: () => void;
  onStartAnother?: () => void;
}

function isSafeAppleUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      (url.hostname === 'music.apple.com' || url.hostname.endsWith('.music.apple.com'))
    );
  } catch {
    return false;
  }
}

export function CreatePlaylistView({
  setlist,
  matchRows,
  onBack,
  onStartAnother,
}: CreatePlaylistViewProps) {
  const {
    loading,
    error,
    addTracksError,
    needsAuth,
    created,
    resumeState,
    dedupeTracks,
    setDedupeTracks,
    selectedSongIds,
    songIds,
    handleCreate,
    handleAddRemainingTracks,
    handleAuthorized,
  } = useCreatePlaylistState({ setlist, matchRows });

  const count = useMemo(() => matchRows.filter((match) => match.appleTrack).length, [matchRows]);
  const dedupeSavings = selectedSongIds.length - songIds.length;
  const incompleteState =
    resumeState && (resumeState.progress === 'unknown' || resumeState.remainingIds.length > 0)
      ? resumeState
      : null;

  if (incompleteState) {
    const hasUnknownProgress = incompleteState.progress === 'unknown';
    const remainingCount = incompleteState.remainingIds.length;
    const addedCount = hasUnknownProgress ? null : Math.max(songIds.length - remainingCount, 0);
    return (
      <section className="terminal-state terminal-state--warning" aria-labelledby="partial-title">
        <h3 id="partial-title">Playlist created; import incomplete</h3>
        {hasUnknownProgress ? (
          <p>
            Apple Music did not report which songs were added. Automatic resume is unavailable
            because retrying could create duplicates.
          </p>
        ) : (
          <p>
            {addedCount} of {songIds.length} songs were added. {remainingCount} remain.
          </p>
        )}
        {addTracksError ? (
          <p role="alert" className="error-text">
            Finishing the import failed: {addTracksError}
          </p>
        ) : null}
        <div className="step-actions">
          {!hasUnknownProgress ? (
            <Button
              variant="secondary"
              onClick={handleAddRemainingTracks}
              loading={loading}
              loadingChildren="Adding remaining songs…"
            >
              Add remaining songs
            </Button>
          ) : null}
          {isSafeAppleUrl(incompleteState.url) ? (
            <a
              href={incompleteState.url}
              target="_blank"
              rel="noopener noreferrer"
              className="button button--primary"
            >
              Open in Apple Music
            </a>
          ) : null}
          {onStartAnother ? (
            <Button variant="secondary" onClick={onStartAnother}>
              Start another setlist
            </Button>
          ) : null}
        </div>
      </section>
    );
  }

  if (created) {
    return (
      <section className="terminal-state terminal-state--success" aria-labelledby="success-title">
        <h3 id="success-title">Playlist ready</h3>
        <p>
          {setlist.artist}
          {setlist.venue ? ` at ${setlist.venue}` : ''} · {songIds.length} song
          {songIds.length === 1 ? '' : 's'} added
        </p>
        <div className="step-actions">
          {isSafeAppleUrl(created.url) ? (
            <a
              href={created.url}
              target="_blank"
              rel="noopener noreferrer"
              className="button button--primary"
            >
              Open in Apple Music
            </a>
          ) : (
            <p className="support-text">Open Apple Music to find the new playlist.</p>
          )}
          {onStartAnother ? (
            <Button variant="secondary" onClick={onStartAnother}>
              Start another setlist
            </Button>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <div className="export-form">
      <p>
        Create a playlist with <strong>{count}</strong> selected song{count === 1 ? '' : 's'} from{' '}
        <strong>{setlist.artist}</strong>.
      </p>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={dedupeTracks}
          onChange={(event) => setDedupeTracks(event.target.checked)}
        />
        Remove duplicate songs
      </label>
      {dedupeTracks && dedupeSavings > 0 ? (
        <p className="support-text">
          {dedupeSavings} duplicate song{dedupeSavings === 1 ? '' : 's'} will be removed.
        </p>
      ) : null}

      {needsAuth ? (
        <div className="auth-prompt">
          <p>Apple Music authorization is required to create this playlist in your library.</p>
          <ConnectAppleMusic
            onAuthorized={handleAuthorized}
            label="Connect Apple Music and create playlist"
          />
        </div>
      ) : (
        <div className="step-actions">
          {onBack ? (
            <Button variant="secondary" onClick={onBack} disabled={loading}>
              Back to matching
            </Button>
          ) : null}
          <Button
            onClick={handleCreate}
            disabled={count === 0}
            loading={loading}
            loadingChildren="Creating playlist…"
          >
            Create playlist
          </Button>
        </div>
      )}

      {error ? (
        <ErrorAlert
          message={error}
          onRetry={() => void handleCreate()}
          retryLabel="Retry create playlist"
        />
      ) : null}
    </div>
  );
}
