import { initMusicKit } from './client';
import type { CreatePlaylistResult, MusicKitPlaylistCreateResponse } from './types';

export interface AddTracksToLibraryPlaylistResult {
  addedIds: string[];
  remainingIds: string[];
}

const TRACK_BATCH_SIZE = 100;

type MusicKitInstance = Awaited<ReturnType<typeof initMusicKit>>;

const trackBatchPayload = (ids: string[]) => ({
  data: ids.map((id) => ({ id: id.trim(), type: 'songs' as const })),
});

const postJson = (music: MusicKitInstance, path: string, body: unknown) =>
  music.api.music(
    path,
    {},
    {
      fetchOptions: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    }
  );

// MusicKit v3 throws for non-2xx replies and puts the fetch Response on `error.data`.
const httpStatus = (error: unknown): number | null => {
  const status = (error as { data?: { status?: unknown } } | null)?.data?.status;
  return typeof status === 'number' ? status : null;
};

// A 4xx other than 408 means Apple refused the write, so nothing was applied.
const isDefiniteRejection = (status: number | null): status is number =>
  status !== null && status >= 400 && status < 500 && status !== 408;

function validatedTrackIds(playlistId: string, songIds: string[]): string[] {
  if (!playlistId.trim()) {
    throw new Error('Invalid playlist ID');
  }
  const validIds = songIds.filter((id) => typeof id === 'string' && id.trim().length > 0);
  if (validIds.length === 0) {
    throw new Error('No valid song IDs to add');
  }
  return validIds;
}

export class AmbiguousMusicMutationError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'AmbiguousMusicMutationError';
  }
}

export class AddTracksToLibraryPlaylistError extends Error {
  readonly progress: 'exact' | 'unknown';
  readonly addedIds: string[];
  readonly remainingIds: string[];
  readonly attemptedIds: string[];

  constructor(
    message: string,
    {
      addedIds,
      remainingIds,
      progress = 'exact',
      attemptedIds = [],
    }: {
      addedIds: string[];
      remainingIds: string[];
      progress?: 'exact' | 'unknown';
      attemptedIds?: string[];
    }
  ) {
    super(message);
    this.name = 'AddTracksToLibraryPlaylistError';
    this.progress = progress;
    this.addedIds = addedIds;
    this.remainingIds = remainingIds;
    this.attemptedIds = attemptedIds;
  }
}

export async function createLibraryPlaylist(name: string): Promise<CreatePlaylistResult> {
  const music = await initMusicKit();
  if (!music.isAuthorized) {
    throw new Error('Not authorized. Please connect Apple Music first.');
  }
  const path = '/v1/me/library/playlists';
  let res: Awaited<ReturnType<typeof postJson>>;
  try {
    res = await postJson(music, path, { attributes: { name } });
  } catch (error) {
    const status = httpStatus(error);
    if (isDefiniteRejection(status)) {
      throw new Error(
        `Failed to create playlist: Apple Music rejected the request (HTTP ${status}).`
      );
    }
    throw new AmbiguousMusicMutationError(
      'Apple Music did not confirm whether the playlist was created. Check your library before retrying.',
      { cause: error }
    );
  }
  const body = res?.data as MusicKitPlaylistCreateResponse | undefined;
  const playlist = Array.isArray(body?.data) ? body.data[0] : body?.data;
  if (!playlist?.id) {
    throw new AmbiguousMusicMutationError(
      'Apple Music returned no playlist ID. Check your library before retrying.'
    );
  }
  return { id: playlist.id, url: playlist.attributes?.url };
}

/**
 * Add song IDs to a library playlist in order. Requires authorization.
 */
export async function addTracksToLibraryPlaylist(
  playlistId: string,
  songIds: string[]
): Promise<AddTracksToLibraryPlaylistResult> {
  // #lizard forgives: length is the two progress-carrying error shapes; one job, fully tested.
  if (songIds.length === 0) {
    return { addedIds: [], remainingIds: [] };
  }
  const validIds = validatedTrackIds(playlistId, songIds);
  const music = await initMusicKit();
  if (!music.isAuthorized) {
    throw new Error('Not authorized. Please connect Apple Music first.');
  }
  const path = `/v1/me/library/playlists/${encodeURIComponent(playlistId)}/tracks`;
  let addedCount = 0;
  for (let i = 0; i < validIds.length; i += TRACK_BATCH_SIZE) {
    const batch = validIds.slice(i, i + TRACK_BATCH_SIZE);
    try {
      await postJson(music, path, trackBatchPayload(batch));
    } catch (error) {
      const status = httpStatus(error);
      if (isDefiniteRejection(status)) {
        throw new AddTracksToLibraryPlaylistError(
          `Adding tracks to playlist failed: Apple Music rejected the request (HTTP ${status}).`,
          {
            progress: 'exact',
            addedIds: validIds.slice(0, addedCount),
            remainingIds: validIds.slice(addedCount),
          }
        );
      }
      throw new AddTracksToLibraryPlaylistError(
        'Apple Music did not confirm whether the current track batch was added. Check the playlist before retrying.',
        {
          progress: 'unknown',
          addedIds: validIds.slice(0, addedCount),
          remainingIds: [],
          attemptedIds: validIds.slice(addedCount),
        }
      );
    }
    addedCount += batch.length;
  }

  return { addedIds: validIds, remainingIds: [] };
}
