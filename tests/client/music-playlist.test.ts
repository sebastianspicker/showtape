import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.fn();
const music = {
  storefrontId: 'us',
  isAuthorized: true,
  music: { api },
  authorize: vi.fn(),
  unauthorize: vi.fn(),
};

vi.mock('@/client/music/client', () => ({
  initMusicKit: vi.fn(async () => music),
}));

import {
  AddTracksToLibraryPlaylistError,
  AmbiguousMusicMutationError,
  addTracksToLibraryPlaylist,
  createLibraryPlaylist,
} from '@/client/music/playlist';

describe('Apple Music playlist mutation boundary', () => {
  beforeEach(() => {
    api.mockReset();
    music.isAuthorized = true;
  });

  it('sends tracks in ordered 100-track batches', async () => {
    const songIds = Array.from({ length: 201 }, (_, index) => `song-${index + 1}`);
    api.mockResolvedValue(undefined);

    await expect(addTracksToLibraryPlaylist('playlist-1', songIds)).resolves.toEqual({
      addedIds: songIds,
      remainingIds: [],
    });

    expect(api).toHaveBeenCalledTimes(3);
    expect(api.mock.calls.map((call) => call[1]?.data.data)).toEqual([
      songIds.slice(0, 100).map((id) => ({ id, type: 'songs' })),
      songIds.slice(100, 200).map((id) => ({ id, type: 'songs' })),
      songIds.slice(200).map((id) => ({ id, type: 'songs' })),
    ]);
  });

  it('reports unknown progress when Apple does not confirm a later mutation', async () => {
    const songIds = Array.from({ length: 101 }, (_, index) => `song-${index + 1}`);
    api.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('network timeout'));

    await expect(addTracksToLibraryPlaylist('playlist-1', songIds)).rejects.toMatchObject({
      name: 'AddTracksToLibraryPlaylistError',
      progress: 'unknown',
      addedIds: songIds.slice(0, 100),
      remainingIds: [],
      attemptedIds: songIds.slice(100),
    } satisfies Partial<AddTracksToLibraryPlaylistError>);
  });

  it('uses the Apple library playlist creation request contract', async () => {
    api.mockResolvedValueOnce({ data: [{ id: 'playlist-1' }] });
    await expect(createLibraryPlaylist('Setlist')).resolves.toMatchObject({ id: 'playlist-1' });
    expect(api).toHaveBeenCalledWith('/v1/me/library/playlists', {
      method: 'POST',
      data: { attributes: { name: 'Setlist' } },
    });
  });

  it('retains unknown progress for ambiguous upstream status responses', async () => {
    api.mockResolvedValueOnce({ errors: [{ status: '503', detail: 'Upstream failed' }] });
    await expect(createLibraryPlaylist('Setlist')).rejects.toBeInstanceOf(
      AmbiguousMusicMutationError
    );
    api.mockResolvedValueOnce({ errors: [{ status: '500', detail: 'Upstream failed' }] });
    await expect(addTracksToLibraryPlaylist('playlist-1', ['1'])).rejects.toMatchObject({
      progress: 'unknown',
      remainingIds: [],
      attemptedIds: ['1'],
    });
    api.mockResolvedValueOnce({ errors: [{ status: '400', detail: 'Invalid track' }] });
    await expect(addTracksToLibraryPlaylist('playlist-1', ['1'])).rejects.toMatchObject({
      progress: 'exact',
      remainingIds: ['1'],
    });
  });

  it('marks an unconfirmed playlist creation as ambiguous', async () => {
    api.mockRejectedValueOnce(new Error('network timeout'));

    await expect(createLibraryPlaylist('Setlist')).rejects.toBeInstanceOf(
      AmbiguousMusicMutationError
    );
  });
});
