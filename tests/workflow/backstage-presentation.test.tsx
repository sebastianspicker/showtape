// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { Setlist } from '@/domain/setlist';
import { SetlistPreview } from '@/workflow/import/SetlistPreview';
import { SuccessExportState } from '@/workflow/playlist/SuccessExportState';
import { CatalogMatchRow, type CatalogMatchRowProps } from '@/workflow/matching/CatalogMatchRow';
import { IncompleteExportState } from '@/workflow/playlist/IncompleteExportState';

const setlist: Setlist = {
  id: '63de4613',
  artist: 'Radiohead',
  venue: 'Roundhouse',
  eventDate: '26-05-2016',
  sourceUrl: 'https://www.setlist.fm/setlist/radiohead/2016/roundhouse-63de4613.html',
  sets: [[{ name: 'The Headmaster Ritual', artist: 'The Smiths', info: 'cover' }]],
};

afterEach(cleanup);

it('keeps cover artist and song notes visible in the source preview', () => {
  render(<SetlistPreview setlist={setlist} />);
  expect(screen.getByText('The Smiths')).toBeTruthy();
  expect(screen.getByText(/cover/)).toBeTruthy();
  expect(screen.getByRole('list').textContent).toContain('The Headmaster Ritual');
});

it('names the completed playlist and counts exported recordings rather than source songs', () => {
  const restart = vi.fn();
  render(
    <SuccessExportState
      setlist={setlist}
      created={{ id: 'playlist', url: 'https://music.apple.com/library/playlist/p.test' }}
      songIds={['1', '2']}
      onStartAnother={restart}
    />
  );
  expect(screen.getByRole('heading', { name: 'Made you a mixtape.' })).toBeTruthy();
  expect(screen.getByText('Completed')).toBeTruthy();
  expect(screen.getByText('Setlist – Radiohead – 26-05-2016')).toBeTruthy();
  expect(screen.getByText('2 of 2 recordings added')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Open in Apple Music' }).getAttribute('rel')).toBe(
    'noopener noreferrer'
  );
  fireEvent.click(screen.getByRole('button', { name: 'Import another setlist' }));
  expect(restart).toHaveBeenCalledOnce();
});

it('provides the library fallback instead of an unsafe playlist link', () => {
  render(
    <SuccessExportState
      setlist={setlist}
      created={{ id: 'playlist', url: 'https://example.com/playlist' }}
      songIds={['1']}
    />
  );
  expect(screen.queryByRole('link', { name: 'Open in Apple Music' })).toBeNull();
  expect(screen.getByText('Open Apple Music to find the new playlist.')).toBeTruthy();
});

it('keeps uncertain track additions explicitly incomplete without an automatic resume action', () => {
  render(
    <IncompleteExportState
      incompleteState={{ progress: 'unknown', remainingIds: ['1'] }}
      songIds={['1']}
      addTracksError={null}
      loading={false}
      onAddRemainingTracks={vi.fn()}
    />
  );
  expect(screen.getByText('Incomplete')).toBeTruthy();
  expect(screen.getByText(/Automatic resume is unavailable/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: /Add remaining/ })).toBeNull();
  expect(screen.queryByText('Completed')).toBeNull();
});

it('keeps pending row actions disabled and restores search and skip when settled', () => {
  const onOpenSearch = vi.fn();
  const onSkip = vi.fn();
  const props: CatalogMatchRowProps = {
    row: { setlistEntry: { name: 'Song' }, status: 'pending', appleTrack: null },
    index: 2,
    isSearching: false,
    searchContext: null,
    onOpenSearch,
    onSkip,
    onSearchQueryChange: vi.fn(),
    onSearch: vi.fn().mockResolvedValue(undefined),
    onChoose: vi.fn(),
    onCancelSearch: vi.fn(),
  };
  const { rerender } = render(
    <ul>
      <CatalogMatchRow {...props} />
    </ul>
  );
  const search = screen.getByRole('button', { name: 'Change match for Song' });
  const skip = screen.getByRole('button', { name: 'Skip Song' });
  expect((search as HTMLButtonElement).disabled).toBe(true);
  expect((skip as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(search);
  fireEvent.click(skip);
  expect(onOpenSearch).not.toHaveBeenCalled();
  expect(onSkip).not.toHaveBeenCalled();
  rerender(
    <ul>
      <CatalogMatchRow {...props} row={{ ...props.row, status: 'unmatched' }} />
    </ul>
  );
  fireEvent.click(search);
  fireEvent.click(skip);
  expect(onOpenSearch).toHaveBeenCalledWith(2);
  expect(onSkip).toHaveBeenCalledWith(2);
});
