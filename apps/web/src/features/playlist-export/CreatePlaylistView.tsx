'use client';

import { buildPlaylistName, type Setlist } from '@repo/core';
import type { MatchRow } from '@/features/matching/types';
import { useCreatePlaylistState } from './useCreatePlaylistState';
import { ExportReviewPanel } from './ExportReviewPanel';
import { ExportActionPanel } from './ExportActionPanel';
import { IncompleteExportState, SuccessExportState } from './ExportTerminalStates';

export interface CreatePlaylistViewProps {
  setlist: Setlist;
  matchRows: MatchRow[];
  onBack?: () => void;
  onStartAnother?: () => void;
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

  const selectedMatches = matchRows.filter((match) => match.appleTrack);
  const count = selectedMatches.length;
  const dedupeSavings = selectedSongIds.length - songIds.length;
  const playlistName = buildPlaylistName(setlist);
  const incompleteState =
    resumeState && (resumeState.progress === 'unknown' || resumeState.remainingIds.length > 0)
      ? resumeState
      : null;

  if (incompleteState) {
    return (
      <IncompleteExportState
        incompleteState={incompleteState}
        songIds={songIds}
        addTracksError={addTracksError}
        loading={loading}
        onAddRemainingTracks={() => {
          void handleAddRemainingTracks();
        }}
        onStartAnother={onStartAnother}
      />
    );
  }

  if (created) {
    return (
      <SuccessExportState
        setlist={setlist}
        created={created}
        songIds={songIds}
        onStartAnother={onStartAnother}
      />
    );
  }

  return (
    <div className="export-layout">
      <ExportReviewPanel
        playlistName={playlistName}
        setlist={setlist}
        selectedMatches={selectedMatches}
        loading={loading}
        onBack={onBack}
      />
      <ExportActionPanel
        needsAuth={needsAuth}
        dedupeTracks={dedupeTracks}
        setDedupeTracks={setDedupeTracks}
        dedupeSavings={dedupeSavings}
        count={count}
        loading={loading}
        error={error}
        onCreate={() => {
          void handleCreate();
        }}
        onAuthorized={() => {
          void handleAuthorized();
        }}
      />
    </div>
  );
}
