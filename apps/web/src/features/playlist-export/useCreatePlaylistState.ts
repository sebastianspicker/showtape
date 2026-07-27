'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { buildPlaylistName, dedupeTrackIdsOrdered } from '@repo/core';
import { getErrorMessage } from '@repo/shared';
import type { MatchRow } from '@/features/matching/types';
import {
  isMusicKitAuthorized,
  createLibraryPlaylist,
  addTracksToLibraryPlaylist,
} from '@/lib/musickit';
import type { Setlist } from '@repo/core';
import {
  type ResumeState,
  createSelectionSignature,
  getAddProgress,
  readResume,
  shouldDiscardResume,
  writeResume,
} from './playlistResume';

export type { ResumeState };

export interface UseCreatePlaylistStateParams {
  setlist: Setlist;
  matchRows: MatchRow[];
}

export interface UseCreatePlaylistStateResult {
  loading: boolean;
  error: string | null;
  addTracksError: string | null;
  needsAuth: boolean;
  created: { id: string; url?: string } | null;
  resumeState: ResumeState | null;
  dedupeTracks: boolean;
  setDedupeTracks: (v: boolean) => void;
  selectedSongIds: string[];
  songIds: string[];
  handleCreate: () => Promise<void>;
  handleAddRemainingTracks: () => Promise<void>;
  handleAuthorized: () => Promise<void>;
}

export function useCreatePlaylistState({
  setlist,
  matchRows,
}: UseCreatePlaylistStateParams): UseCreatePlaylistStateResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; url?: string } | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [addTracksError, setAddTracksError] = useState<string | null>(null);
  const [dedupeTracks, setDedupeTracks] = useState(false);
  const [resumeState, setResumeState] = useState<ResumeState | null>(null);
  const mutationInFlightRef = useRef(false);

  const selectedSongIds = useMemo(
    () => matchRows.map((r) => r.appleTrack?.id).filter(Boolean) as string[],
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

  useEffect(() => {
    const stored = readResume(setlist.id);
    if (!stored) {
      setResumeState(null);
      return;
    }

    if (shouldDiscardResume(stored, selectionSignature, songIds)) {
      writeResume(setlist.id, null);
      setResumeState(null);
      return;
    }

    setResumeState(stored);
  }, [selectionSignature, setlist.id, songIds]);

  async function handleCreate() {
    if (mutationInFlightRef.current) return;
    mutationInFlightRef.current = true;
    setError(null);
    setAddTracksError(null);
    setNeedsAuth(false);
    setLoading(true);
    try {
      const authorized = await isMusicKitAuthorized();
      if (!authorized) {
        setNeedsAuth(true);
        return;
      }

      if (songIds.length === 0) {
        setError('No tracks to add. Match at least one track first.');
        return;
      }

      const name = buildPlaylistName(setlist);
      const { id, url } = await createLibraryPlaylist(name);
      setCreated({ id, url });

      try {
        await addTracksToLibraryPlaylist(id, songIds);
        setResumeState(null);
        writeResume(setlist.id, null);
      } catch (addErr) {
        const progress = getAddProgress(addErr, songIds);
        const resume: ResumeState = {
          status: 'incomplete',
          id,
          url,
          ...progress,
          selectionSignature,
          storedAt: Date.now(),
        };
        setResumeState(resume);
        writeResume(setlist.id, resume);
        setAddTracksError(getErrorMessage(addErr, 'Adding tracks failed.'));
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create playlist.'));
    } finally {
      setLoading(false);
      mutationInFlightRef.current = false;
    }
  }

  async function handleAddRemainingTracks() {
    if (mutationInFlightRef.current) return;
    if (!resumeState) return;
    if (resumeState.progress === 'unknown') {
      setAddTracksError(
        'Cannot safely resume because Apple Music did not report which tracks remain.'
      );
      return;
    }
    if (resumeState.remainingIds.length === 0) return;

    mutationInFlightRef.current = true;
    setAddTracksError(null);
    setLoading(true);
    try {
      await addTracksToLibraryPlaylist(resumeState.id, resumeState.remainingIds);
      setCreated({ id: resumeState.id, url: resumeState.url });
      setResumeState(null);
      writeResume(setlist.id, null);
      setAddTracksError(null);
    } catch (err) {
      const progress = getAddProgress(err, resumeState.remainingIds);
      const nextResume: ResumeState = {
        ...resumeState,
        ...progress,
        selectionSignature,
        storedAt: Date.now(),
      };
      setResumeState(nextResume);
      writeResume(setlist.id, nextResume);
      setAddTracksError(getErrorMessage(err, 'Adding tracks failed.'));
    } finally {
      setLoading(false);
      mutationInFlightRef.current = false;
    }
  }

  async function handleAuthorized() {
    setNeedsAuth(false);
    await handleCreate();
  }

  return {
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
  };
}
