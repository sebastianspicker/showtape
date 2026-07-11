'use client';

import { useEffect, useMemo, useState } from 'react';
import { buildPlaylistName, dedupeTrackIdsOrdered } from '@repo/core';
import { getErrorMessage } from '@repo/shared';
import type { MatchRow } from '@/features/matching/types';
import {
  isMusicKitAuthorized,
  createLibraryPlaylist,
  addTracksToLibraryPlaylist,
} from '@/lib/musickit';
import type { Setlist } from '@repo/core';

interface ResumeState {
  status: 'incomplete';
  progress: 'exact' | 'unknown';
  id: string;
  url?: string;
  remainingIds: string[];
  attemptedIds?: string[];
  selectionSignature: string;
  storedAt?: number;
}

const RESUME_STALE_AFTER_MS = 30 * 60 * 1000;

function resumeKey(setlistId: string): string {
  return `playlist_resume_v1:${setlistId}`;
}

function readResume(setlistId: string): ResumeState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(resumeKey(setlistId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ResumeState;
    if (
      parsed?.status !== 'incomplete' ||
      !parsed.id ||
      typeof parsed.selectionSignature !== 'string' ||
      !Array.isArray(parsed.remainingIds)
    ) {
      return null;
    }
    return {
      ...parsed,
      progress: parsed.progress === 'unknown' ? 'unknown' : 'exact',
    };
  } catch {
    return null;
  }
}

function createSelectionSignature(songIds: string[], dedupeTracks: boolean): string {
  // Resume applies only to the exact exported sequence; otherwise retrying could add wrong tracks.
  return JSON.stringify({ dedupeTracks, songIds });
}

function isRemainingSubsetOfSelection(remainingIds: string[], songIds: string[]): boolean {
  const available = new Map<string, number>();
  for (const id of songIds) {
    available.set(id, (available.get(id) ?? 0) + 1);
  }
  for (const id of remainingIds) {
    const count = available.get(id) ?? 0;
    if (count === 0) return false;
    available.set(id, count - 1);
  }
  return true;
}

function getAddProgress(
  error: unknown,
  attemptedIds: string[]
): Pick<ResumeState, 'progress' | 'remainingIds' | 'attemptedIds'> {
  const remainingIds = (error as { remainingIds?: unknown } | null)?.remainingIds;
  if (
    Array.isArray(remainingIds) &&
    remainingIds.every((id) => typeof id === 'string' && id.trim().length > 0)
  ) {
    return { progress: 'exact', remainingIds };
  }
  return { progress: 'unknown', remainingIds: [], attemptedIds };
}

function writeResume(setlistId: string, value: ResumeState | null): void {
  if (typeof window === 'undefined') return;
  try {
    const key = resumeKey(setlistId);
    if (!value) {
      window.sessionStorage.removeItem(key);
      return;
    }
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota/access errors — resume is a best-effort feature
  }
}

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
    if (stored) {
      const storedAt = (stored as ResumeState & { storedAt?: number }).storedAt;
      const isStale = typeof storedAt === 'number' && Date.now() - storedAt > RESUME_STALE_AFTER_MS;
      const isMismatched = stored.selectionSignature !== selectionSignature;
      const isEmptyExact = stored.progress === 'exact' && stored.remainingIds.length === 0;
      const hasInvalidRemainingIds =
        stored.progress === 'exact' && !isRemainingSubsetOfSelection(stored.remainingIds, songIds);
      if (isStale || isMismatched || isEmptyExact || hasInvalidRemainingIds) {
        writeResume(setlist.id, null);
        setResumeState(null);
      } else {
        setResumeState(stored);
      }
    } else {
      setResumeState(null);
    }
  }, [selectionSignature, setlist.id, songIds]);

  async function handleCreate() {
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
    }
  }

  async function handleAddRemainingTracks() {
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
