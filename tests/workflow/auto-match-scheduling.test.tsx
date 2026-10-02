// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchCatalog } from '@/client/music/catalog';
import type { Setlist } from '@/domain/setlist';
import { MatchingWorkflow } from '@/workflow/matching/MatchingWorkflow';
import type { MatchRow } from '@/workflow/matching/model';

vi.mock('@/client/music/catalog', () => ({ searchCatalog: vi.fn() }));

const searchMock = vi.mocked(searchCatalog);

const setlist = (songs: string[]): Setlist => ({
  id: 'aaaa1111',
  artist: 'Artist',
  sets: [songs.map((song) => ({ name: song }))],
});

const draft: MatchRow[] = [
  {
    setlistEntry: { name: 'Alpha', artist: 'Artist' },
    appleTrack: { id: 'chosen', name: 'Chosen' },
    status: 'matched',
  },
];

const settle = () => new Promise((resolve) => setTimeout(resolve, 30));
const queries = () => searchMock.mock.calls.map(([term]) => term);

afterEach(() => {
  cleanup();
  searchMock.mockReset();
});

function stubCatalog() {
  searchMock.mockImplementation((term: string) =>
    Promise.resolve([{ id: `track-${term}`, name: `${term} (Apple)` }])
  );
}

describe('automatic matching scheduling', () => {
  it('starts no searches when mounted with an initial draft', async () => {
    stubCatalog();
    render(
      <MatchingWorkflow
        setlist={setlist(['Alpha'])}
        initialDraft={draft}
        onProceedToCreatePlaylist={vi.fn()}
      />
    );
    await settle();

    expect(searchMock).not.toHaveBeenCalled();
    expect(screen.getByText('1 selected')).toBeTruthy();
    expect(screen.getByText('Chosen')).toBeTruthy();
  });

  it('runs one search per unique query when mounted without a draft', async () => {
    stubCatalog();
    render(
      <MatchingWorkflow
        setlist={setlist(['Alpha', 'Beta', 'Alpha'])}
        onProceedToCreatePlaylist={vi.fn()}
      />
    );
    await screen.findByText('3 selected');
    await settle();

    expect(queries().sort()).toEqual(['Alpha Artist', 'Beta Artist']);
  });

  it('still runs one search per unique query under StrictMode', async () => {
    stubCatalog();
    render(
      <StrictMode>
        <MatchingWorkflow
          setlist={setlist(['Alpha', 'Beta', 'Alpha'])}
          onProceedToCreatePlaylist={vi.fn()}
        />
      </StrictMode>
    );
    await screen.findByText('3 selected');
    await settle();

    expect(queries().sort()).toEqual(['Alpha Artist', 'Beta Artist']);
  });

  it('starts a fresh run when the setlist content changes but not for an equal copy', async () => {
    stubCatalog();
    const onProceed = vi.fn();
    const { rerender } = render(
      <MatchingWorkflow setlist={setlist(['Alpha'])} onProceedToCreatePlaylist={onProceed} />
    );
    await screen.findByText('1 selected');
    expect(queries()).toEqual(['Alpha Artist']);

    rerender(
      <MatchingWorkflow setlist={setlist(['Alpha'])} onProceedToCreatePlaylist={onProceed} />
    );
    await settle();
    expect(queries()).toEqual(['Alpha Artist']);

    rerender(
      <MatchingWorkflow
        setlist={setlist(['Alpha', 'Gamma'])}
        onProceedToCreatePlaylist={onProceed}
      />
    );
    await waitFor(() => {
      expect(queries()).toEqual(['Alpha Artist', 'Alpha Artist', 'Gamma Artist']);
    });
    await screen.findByText('2 selected');
    await settle();
    expect(queries()).toEqual(['Alpha Artist', 'Alpha Artist', 'Gamma Artist']);
  });
});
