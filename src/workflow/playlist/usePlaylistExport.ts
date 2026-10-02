'use client';

import { useMemo, useRef, useState } from 'react';
import { createSelectionSignature, dedupeTrackIdsOrdered } from '@/domain/matching';
import { buildPlaylistName, type Setlist } from '@/domain/setlist';
import { getErrorMessage } from '@/ui/error-message';
import { addTracksToLibraryPlaylist, createLibraryPlaylist } from '@/client/music/playlist';
import { isMusicKitAuthorized } from '@/client/music/client';
import type { MatchRow } from '@/workflow/matching/model';
import {
  getAddProgress,
  readResume,
  shouldDiscardResume,
  writeResume,
  type ResumeState,
} from './resume';

export interface CreatedPlaylist {
  id: string;
  url?: string;
}

export interface UsePlaylistExportParams {
  setlist: Setlist;
  matchRows: MatchRow[];
}

export interface PlaylistExport {
  loading: boolean;
  error: string | null;
  createOutcomeUnknown: boolean;
  addTracksError: string | null;
  needsAuth: boolean;
  created: CreatedPlaylist | null;
  resumeState: ResumeState | null;
  dedupeTracks: boolean;
  setDedupeTracks: (value: boolean) => void;
  selectedSongIds: string[];
  songIds: string[];
  create: () => Promise<void>;
  addRemaining: () => Promise<void>;
  /** Continue with playlist creation after the user authorized Apple Music. */
  authorized: () => Promise<void>;
}

function isAmbiguousMusicMutationError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AmbiguousMusicMutationError';
}

/** Owns the state and exclusive Apple Music mutations for a single playlist export. */
export function usePlaylistExport({ setlist, matchRows }: UsePlaylistExportParams): PlaylistExport {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createOutcomeUnknown, setCreateOutcomeUnknown] = useState(false);
  const [created, setCreated] = useState<CreatedPlaylist | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [addTracksError, setAddTracksError] = useState<string | null>(null);
  const [dedupeTracks, setDedupeTracks] = useState(false);
  const mutationInFlightRef = useRef(false);
  const selectedSongIds = useMemo(
    () => matchRows.flatMap((row) => (row.appleTrack ? [row.appleTrack.id] : [])),
    [matchRows]
  );
  const songIds = useMemo(
    () => (dedupeTracks ? dedupeTrackIdsOrdered(selectedSongIds) : selectedSongIds),
    [dedupeTracks, selectedSongIds]
  );
  const selectionSignature = useMemo(
    () => createSelectionSignature(songIds, dedupeTracks),
    [dedupeTracks, songIds]
  );
  const [resumeState, setResumeState] = useState<ResumeState | null>(() => {
    const stored = readResume(setlist.id);
    if (!stored || shouldDiscardResume(stored, selectionSignature, songIds)) {
      if (stored) writeResume(setlist.id, null);
      return null;
    }
    return stored;
  });

  const storeResume = (next: ResumeState | null) => {
    setResumeState(next);
    writeResume(setlist.id, next);
  };

  const addTracksOrStoreResume = async (id: string, url: string | undefined) => {
    try {
      await addTracksToLibraryPlaylist(id, songIds);
      storeResume(null);
    } catch (addErr) {
      storeResume({
        status: 'incomplete',
        id,
        url,
        ...getAddProgress(addErr, songIds),
        selectionSignature,
        storedAt: Date.now(),
      });
      setAddTracksError(getErrorMessage(addErr, 'Adding tracks failed.'));
    }
  };

  const createPlaylist = async () => {
    setError(null);
    setCreateOutcomeUnknown(false);
    setAddTracksError(null);
    setNeedsAuth(false);
    setLoading(true);
    try {
      if (!(await isMusicKitAuthorized())) {
        setNeedsAuth(true);
        return;
      }
      if (songIds.length === 0) {
        setError('No tracks to add. Match at least one track first.');
        return;
      }
      const { id, url } = await createLibraryPlaylist(buildPlaylistName(setlist));
      setCreated({ id, url });
      await addTracksOrStoreResume(id, url);
    } catch (err) {
      setCreateOutcomeUnknown(isAmbiguousMusicMutationError(err));
      setError(getErrorMessage(err, 'Failed to create playlist.'));
    } finally {
      setLoading(false);
    }
  };

  const addRemainingTracks = async () => {
    if (!resumeState) return;
    if (resumeState.progress === 'unknown') {
      setAddTracksError(
        'Cannot safely resume because Apple Music did not report which tracks remain.'
      );
      return;
    }
    if (resumeState.remainingIds.length === 0) return;
    setAddTracksError(null);
    setLoading(true);
    try {
      await addTracksToLibraryPlaylist(resumeState.id, resumeState.remainingIds);
      setCreated({ id: resumeState.id, url: resumeState.url });
      storeResume(null);
      setAddTracksError(null);
    } catch (err) {
      storeResume({
        ...resumeState,
        ...getAddProgress(err, resumeState.remainingIds),
        selectionSignature,
        storedAt: Date.now(),
      });
      setAddTracksError(getErrorMessage(err, 'Adding tracks failed.'));
    } finally {
      setLoading(false);
    }
  };

  const runExclusive = async (action: () => Promise<void>) => {
    if (mutationInFlightRef.current) return;
    mutationInFlightRef.current = true;
    try {
      await action();
    } finally {
      mutationInFlightRef.current = false;
    }
  };

  return {
    loading,
    error,
    createOutcomeUnknown,
    addTracksError,
    needsAuth,
    created,
    resumeState,
    dedupeTracks,
    setDedupeTracks,
    selectedSongIds,
    songIds,
    create: () => runExclusive(createPlaylist),
    addRemaining: () => runExclusive(addRemainingTracks),
    authorized: async () => {
      setNeedsAuth(false);
      await runExclusive(createPlaylist);
    },
  };
}
