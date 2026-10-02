// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { searchCatalog } from '@/client/music/catalog';
import { createLibraryPlaylist, addTracksToLibraryPlaylist } from '@/client/music/playlist';
import { ShowtapeWorkflow } from '@/workflow/ShowtapeWorkflow';

vi.mock('@/client/music/catalog', () => ({ searchCatalog: vi.fn() }));
vi.mock('@/client/music/client', () => ({
  isMusicKitAuthorized: vi.fn(() => Promise.resolve(true)),
  authorizeMusicKit: vi.fn(() => Promise.resolve('user-token')),
  initMusicKit: vi.fn(),
}));
vi.mock('@/client/music/playlist', () => ({
  createLibraryPlaylist: vi.fn(),
  addTracksToLibraryPlaylist: vi.fn(),
}));

const searchMock = vi.mocked(searchCatalog);
const createPlaylistMock = vi.mocked(createLibraryPlaylist);
const addTracksMock = vi.mocked(addTracksToLibraryPlaylist);

const setlists: Record<string, unknown> = {
  aaaa1111: {
    id: 'aaaa1111',
    artist: 'Artist A',
    venue: 'Hall A',
    eventDate: '01-02-2020',
    sourceUrl: 'https://www.setlist.fm/setlist/a/aaaa1111.html',
    sets: [[{ name: 'Alpha' }, { name: 'Beta' }]],
  },
  bbbb2222: {
    id: 'bbbb2222',
    artist: 'Artist B',
    venue: 'Hall B',
    eventDate: '03-04-2021',
    sourceUrl: 'https://www.setlist.fm/setlist/b/bbbb2222.html',
    sets: [[{ name: 'Gamma' }]],
  },
};

function memoryStorage(): Storage {
  const entries = new Map<string, string>();
  return {
    get length() {
      return entries.size;
    },
    clear: () => entries.clear(),
    getItem: (key) => entries.get(key) ?? null,
    key: (index) => [...entries.keys()][index] ?? null,
    removeItem: (key) => void entries.delete(key),
    setItem: (key, value) => void entries.set(key, String(value)),
  };
}

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage());
  vi.stubGlobal('sessionStorage', memoryStorage());
  vi.stubGlobal('scrollTo', vi.fn());
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = new URL(String(input), 'https://showtape.test');
      const body = setlists[url.searchParams.get('id') ?? ''];
      return Promise.resolve(
        body
          ? new Response(JSON.stringify(body))
          : new Response(JSON.stringify({ error: 'missing', code: 'NOT_FOUND' }), { status: 404 })
      );
    })
  );
  searchMock.mockImplementation((term: string) =>
    Promise.resolve([{ id: `track-${term}`, name: `${term} (Apple)`, artistName: 'Someone' }])
  );
  createPlaylistMock.mockResolvedValue({ id: 'p.1', url: 'https://music.apple.com/library/p.1' });
  addTracksMock.mockResolvedValue({ addedIds: [], remainingIds: [] });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const input = () => screen.getByLabelText('setlist.fm URL or ID') as HTMLInputElement;

async function importSetlist(id: string) {
  fireEvent.change(input(), { target: { value: id } });
  fireEvent.click(screen.getByRole('button', { name: 'Import setlist' }));
  await screen.findByRole('heading', { name: 'Review setlist' });
}

async function startMatching(artist: string, songCount: number) {
  fireEvent.click(screen.getByRole('button', { name: 'Match songs on Apple Music' }));
  await screen.findByRole('heading', { name: artist });
  await screen.findByText(`${songCount} selected`);
}

describe('Showtape journey characterization', () => {
  it('shows the rail and stage labels for every step', async () => {
    render(<ShowtapeWorkflow />);

    const rail = () =>
      within(screen.getByRole('navigation', { name: 'Playlist creation progress' }));
    const railItems = () => rail().getAllByRole('listitem');
    expect(railItems().map((item) => item.textContent)).toEqual([
      '01Import',
      '02Preview',
      '03Match',
      '04Export',
    ]);
    expect(railItems().map((item) => item.getAttribute('aria-current'))).toEqual([
      'step',
      null,
      null,
      null,
    ]);
    expect(screen.getByText('01 / Import')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Keep the set.' })).toBeTruthy();

    await importSetlist('aaaa1111');
    expect(screen.getByText('Step 02 / 04 — Preview')).toBeTruthy();
    expect(railItems().map((item) => item.getAttribute('aria-current'))).toEqual([
      null,
      'step',
      null,
      null,
    ]);

    await startMatching('Artist A', 2);
    expect(screen.getByText('03 / Review recordings')).toBeTruthy();
    expect(railItems().map((item) => item.getAttribute('aria-current'))).toEqual([
      null,
      null,
      'step',
      null,
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Review playlist' }));
    await screen.findByRole('heading', { name: 'Save to Apple Music' });
    expect(screen.getByText('Step 04 / 04 — Export')).toBeTruthy();
    expect(railItems().map((item) => item.getAttribute('aria-current'))).toEqual([
      null,
      null,
      null,
      'step',
    ]);
  });

  it('keeps the input when changing the setlist and drops the draft for a different setlist', async () => {
    render(<ShowtapeWorkflow />);
    await importSetlist('aaaa1111');
    await startMatching('Artist A', 2);
    fireEvent.click(screen.getByRole('button', { name: 'Skip Beta' }));
    await screen.findByText('Skipped');
    fireEvent.click(screen.getByRole('button', { name: 'Back to preview' }));
    await screen.findByRole('heading', { name: 'Review setlist' });

    fireEvent.click(screen.getByRole('button', { name: 'Change setlist' }));
    expect(screen.getByText('01 / Import')).toBeTruthy();
    expect(input().value).toBe('aaaa1111');

    await importSetlist('bbbb2222');
    fireEvent.click(screen.getByRole('button', { name: 'Match songs on Apple Music' }));
    await screen.findByRole('heading', { name: 'Artist B' });
    await screen.findByText('1 selected');

    expect(screen.queryByText('Alpha')).toBeNull();
    expect(screen.queryByText('Beta')).toBeNull();
    expect(screen.queryByText('Skipped')).toBeNull();
    expect(screen.getByText('Gamma')).toBeTruthy();
    expect(screen.getByText(/Gamma Artist B \(Apple\)/)).toBeTruthy();
    expect(searchMock.mock.calls.map(([term]) => term)).toEqual([
      'Alpha Artist A',
      'Beta Artist A',
      'Gamma Artist B',
    ]);
  });

  it('restores match choices and skips the catalog search when returning from the preview', async () => {
    render(<ShowtapeWorkflow />);
    await importSetlist('aaaa1111');
    await startMatching('Artist A', 2);
    fireEvent.click(screen.getByRole('button', { name: 'Skip Beta' }));
    await screen.findByText('Skipped');
    expect(searchMock).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole('button', { name: 'Back to preview' }));
    await screen.findByRole('heading', { name: 'Review setlist' });
    fireEvent.click(screen.getByRole('button', { name: 'Match songs on Apple Music' }));
    await screen.findByRole('heading', { name: 'Artist A' });

    expect(screen.getByText('Skipped')).toBeTruthy();
    expect(screen.getByText('1 selected')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Skip Alpha' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Skip Beta' })).toBeNull();
    // The restored draft is shown without waiting for, or starting, another run.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(searchMock).toHaveBeenCalledTimes(2);
  });

  it('resumes searching rows that were still pending when the user went back mid-run', async () => {
    let releaseBeta: (() => void) | undefined;
    searchMock.mockImplementation((term: string) => {
      const result = [{ id: `track-${term}`, name: `${term} (Apple)`, artistName: 'Someone' }];
      if (term === 'Beta Artist A' && !releaseBeta) {
        return new Promise((resolve) => {
          releaseBeta = () => resolve(result);
        });
      }
      return Promise.resolve(result);
    });
    render(<ShowtapeWorkflow />);
    await importSetlist('aaaa1111');
    fireEvent.click(screen.getByRole('button', { name: 'Match songs on Apple Music' }));
    await screen.findByRole('heading', { name: 'Artist A' });
    await screen.findByText(/Alpha Artist A \(Apple\)/);

    fireEvent.click(screen.getByRole('button', { name: 'Back to preview' }));
    await screen.findByRole('heading', { name: 'Review setlist' });
    releaseBeta?.();
    fireEvent.click(screen.getByRole('button', { name: 'Match songs on Apple Music' }));
    await screen.findByRole('heading', { name: 'Artist A' });

    await screen.findByText('2 selected');
    expect(screen.getByRole('button', { name: 'Review playlist' })).toHaveProperty(
      'disabled',
      false
    );
    // Alpha is not searched again; only the pending Beta row is.
    expect(searchMock.mock.calls.map(([term]) => term)).toEqual([
      'Alpha Artist A',
      'Beta Artist A',
      'Beta Artist A',
    ]);
  });

  it('clears the input and returns to import after a successful export', async () => {
    render(<ShowtapeWorkflow />);
    await importSetlist('aaaa1111');
    await startMatching('Artist A', 2);
    fireEvent.click(screen.getByRole('button', { name: 'Review playlist' }));
    await screen.findByRole('heading', { name: 'Save to Apple Music' });

    fireEvent.click(screen.getByRole('button', { name: 'Create playlist' }));
    await screen.findByRole('heading', { name: 'Made you a mixtape.' });
    expect(createPlaylistMock).toHaveBeenCalledWith('Setlist – Artist A – 01-02-2020');
    expect(addTracksMock).toHaveBeenCalledWith('p.1', [
      'track-Alpha Artist A',
      'track-Beta Artist A',
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Import another setlist' }));
    await screen.findByText('01 / Import');
    expect(input().value).toBe('');
  });

  it('returns from export to matching with the same choices and no new searches', async () => {
    render(<ShowtapeWorkflow />);
    await importSetlist('aaaa1111');
    await startMatching('Artist A', 2);
    fireEvent.click(screen.getByRole('button', { name: 'Review playlist' }));
    await screen.findByRole('heading', { name: 'Save to Apple Music' });

    fireEvent.click(screen.getByRole('button', { name: '← Back to matching' }));
    await screen.findByRole('heading', { name: 'Artist A' });

    expect(screen.getByText('2 selected')).toBeTruthy();
    expect(searchMock).toHaveBeenCalledTimes(2);
  });
});
