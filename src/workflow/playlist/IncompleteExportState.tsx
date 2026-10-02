'use client';

import { Button } from '@/ui/Button';
import { getSafeAppleUrl } from './appleUrl';

interface IncompleteExportActionsProps {
  hasUnknownProgress: boolean;
  safeAppleUrl: string | null;
  loading: boolean;
  onAddRemainingTracks: VoidFunction;
  onStartAnother?: VoidFunction;
}

function IncompleteExportActions({
  hasUnknownProgress,
  safeAppleUrl,
  loading,
  onAddRemainingTracks,
  onStartAnother,
}: IncompleteExportActionsProps) {
  return (
    <div className="step-actions">
      {!hasUnknownProgress ? (
        <Button
          variant="secondary"
          onClick={onAddRemainingTracks}
          loading={loading}
          loadingChildren="Adding remaining songs…"
        >
          Add remaining songs
        </Button>
      ) : null}
      {safeAppleUrl ? (
        <a
          href={safeAppleUrl}
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
  );
}

export interface IncompleteResumeState {
  progress: 'exact' | 'unknown';
  url?: string;
  remainingIds: string[];
}

export interface IncompleteExportStateProps {
  incompleteState: IncompleteResumeState;
  songIds: string[];
  addTracksError: string | null;
  loading: boolean;
  onAddRemainingTracks: VoidFunction;
  onStartAnother?: VoidFunction;
}

export function IncompleteExportState({
  incompleteState,
  songIds,
  addTracksError,
  loading,
  onAddRemainingTracks,
  onStartAnother,
}: IncompleteExportStateProps) {
  const hasUnknownProgress = incompleteState.progress === 'unknown';
  const remainingCount = incompleteState.remainingIds.length;
  const addedCount = hasUnknownProgress ? null : Math.max(songIds.length - remainingCount, 0);
  const safeAppleUrl = getSafeAppleUrl(incompleteState.url);

  return (
    <section
      className="terminal-state terminal-state--warning export-terminal"
      aria-labelledby="partial-title"
    >
      <p className="completion-stamp completion-stamp--incomplete">Incomplete</p>
      <h3 id="partial-title">Playlist created; import incomplete</h3>
      {hasUnknownProgress ? (
        <p>
          Apple Music did not report which songs were added. Automatic resume is unavailable because
          retrying could create duplicates.
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
      <IncompleteExportActions
        hasUnknownProgress={hasUnknownProgress}
        safeAppleUrl={safeAppleUrl}
        loading={loading}
        onAddRemainingTracks={onAddRemainingTracks}
        onStartAnother={onStartAnother}
      />
    </section>
  );
}
