'use client';

import { useMemo, type Dispatch } from 'react';
import { Button } from '@repo/ui';
import type { Setlist } from '@repo/core';
import type { MatchRow } from '@/features/matching/types';
import { ErrorAlert } from '@/components/ErrorAlert';
import { ConnectAppleMusic } from '@/features/matching/ConnectAppleMusic';
import {
  useCreatePlaylistState,
  type UseCreatePlaylistStateResult,
} from './useCreatePlaylistState';

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

interface IncompletePlaylistStateProps {
  incompleteState: NonNullable<UseCreatePlaylistStateResult['resumeState']>;
  songIds: string[];
  addTracksError: string | null;
  loading: boolean;
  onAddRemainingTracks: () => Promise<void>;
  onStartAnother?: () => void;
}

function IncompletePlaylistState({
  incompleteState,
  songIds,
  addTracksError,
  loading,
  onAddRemainingTracks,
  onStartAnother,
}: IncompletePlaylistStateProps) {
  const hasUnknownProgress = incompleteState.progress === 'unknown';
  const remainingCount = incompleteState.remainingIds.length;
  const addedCount = hasUnknownProgress ? null : Math.max(songIds.length - remainingCount, 0);

  return (
    <section className="terminal-state terminal-state--warning" aria-labelledby="partial-title">
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

interface CreatedPlaylistStateProps {
  created: NonNullable<UseCreatePlaylistStateResult['created']>;
  setlist: Setlist;
  songIds: string[];
  onStartAnother?: () => void;
}

function CreatedPlaylistState({
  created,
  setlist,
  songIds,
  onStartAnother,
}: CreatedPlaylistStateProps) {
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

interface PlaylistOptionsProps {
  count: number;
  setlist: Setlist;
  dedupeTracks: boolean;
  dedupeSavings: number;
  onDedupeChange: Dispatch<boolean>;
}

function PlaylistOptions({
  count,
  setlist,
  dedupeTracks,
  dedupeSavings,
  onDedupeChange,
}: PlaylistOptionsProps) {
  return (
    <>
      <p>
        Create a playlist with <strong>{count}</strong> selected song{count === 1 ? '' : 's'} from{' '}
        <strong>{setlist.artist}</strong>.
      </p>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={dedupeTracks}
          onChange={(event) => {
            onDedupeChange(event.target.checked);
          }}
        />
        Remove duplicate songs
      </label>
      {dedupeTracks && dedupeSavings > 0 ? (
        <p className="support-text">
          {dedupeSavings} duplicate song{dedupeSavings === 1 ? '' : 's'} will be removed.
        </p>
      ) : null}
    </>
  );
}

interface PlaylistCreationActionsProps {
  needsAuth: boolean;
  loading: boolean;
  count: number;
  error: string | null;
  onBack?: () => void;
  onAuthorized: () => void;
  onCreate: () => void;
}

function PlaylistCreationActions({
  needsAuth,
  loading,
  count,
  error,
  onBack,
  onAuthorized,
  onCreate,
}: PlaylistCreationActionsProps) {
  return (
    <>
      {needsAuth ? (
        <div className="auth-prompt">
          <p>Apple Music authorization is required to create this playlist in your library.</p>
          <ConnectAppleMusic
            onAuthorized={onAuthorized}
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
            onClick={onCreate}
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
          onRetry={() => {
            onCreate();
          }}
          retryLabel="Retry create playlist"
        />
      ) : null}
    </>
  );
}

interface EditablePlaylistStateProps {
  state: UseCreatePlaylistStateResult;
  setlist: Setlist;
  matchRows: MatchRow[];
  onBack?: () => void;
}

function EditablePlaylistState({ state, setlist, matchRows, onBack }: EditablePlaylistStateProps) {
  const count = useMemo(() => matchRows.filter((match) => match.appleTrack).length, [matchRows]);
  const dedupeSavings = state.selectedSongIds.length - state.songIds.length;
  return (
    <div className="export-form">
      <PlaylistOptions
        count={count}
        setlist={setlist}
        dedupeTracks={state.dedupeTracks}
        dedupeSavings={dedupeSavings}
        onDedupeChange={state.setDedupeTracks}
      />
      <PlaylistCreationActions
        needsAuth={state.needsAuth}
        loading={state.loading}
        count={count}
        error={state.error}
        onBack={onBack}
        onAuthorized={state.handleAuthorized}
        onCreate={() => {
          void state.handleCreate();
        }}
      />
    </div>
  );
}

interface PlaylistStateRouterProps extends CreatePlaylistViewProps {
  state: UseCreatePlaylistStateResult;
}

function PlaylistStateRouter({
  setlist,
  matchRows,
  onBack,
  onStartAnother,
  state,
}: PlaylistStateRouterProps) {
  const incompleteState =
    state.resumeState &&
    (state.resumeState.progress === 'unknown' || state.resumeState.remainingIds.length > 0)
      ? state.resumeState
      : null;
  if (incompleteState) {
    return (
      <IncompletePlaylistState
        incompleteState={incompleteState}
        songIds={state.songIds}
        addTracksError={state.addTracksError}
        loading={state.loading}
        onAddRemainingTracks={state.handleAddRemainingTracks}
        onStartAnother={onStartAnother}
      />
    );
  }
  if (state.created) {
    return (
      <CreatedPlaylistState
        created={state.created}
        setlist={setlist}
        songIds={state.songIds}
        onStartAnother={onStartAnother}
      />
    );
  }
  return (
    <EditablePlaylistState state={state} setlist={setlist} matchRows={matchRows} onBack={onBack} />
  );
}

export function CreatePlaylistView(props: CreatePlaylistViewProps) {
  const state = useCreatePlaylistState({ setlist: props.setlist, matchRows: props.matchRows });
  return (
    <PlaylistStateRouter
      state={state}
      setlist={props.setlist}
      matchRows={props.matchRows}
      onBack={props.onBack}
      onStartAnother={props.onStartAnother}
    />
  );
}
