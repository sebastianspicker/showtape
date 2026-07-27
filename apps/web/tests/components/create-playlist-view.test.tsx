// @vitest-environment jsdom
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import type { Setlist } from '@repo/core';
import type { MatchRow } from '../../src/features/matching/types';

vi.mock('../../src/features/matching/ConnectAppleMusic', () => ({
  ConnectAppleMusic: ({
    onAuthorized,
    label = 'Connect Apple Music',
  }: {
    onAuthorized?: () => void;
    label?: string;
  }) => React.createElement('button', { type: 'button', onClick: onAuthorized }, label),
}));

const mockUseCreatePlaylistState = vi.fn();
vi.mock('../../src/features/playlist-export/useCreatePlaylistState', () => ({
  useCreatePlaylistState: (...args: unknown[]) => mockUseCreatePlaylistState(...args),
}));

import { CreatePlaylistView } from '../../src/features/playlist-export/CreatePlaylistView';

const setlist: Setlist = {
  id: 'setlist-1',
  artist: 'Test Artist',
  venue: 'Test Venue',
  sets: [[{ name: 'Song A', artist: 'Test Artist' }]],
};

const matchRows: MatchRow[] = [
  {
    setlistEntry: { name: 'Song A', artist: 'Test Artist' },
    appleTrack: { id: 'song-1', name: 'Song A', artistName: 'Test Artist' },
    status: 'matched',
  },
];

const duplicateMatchRows: MatchRow[] = [
  {
    setlistEntry: { name: 'Song A', artist: 'Test Artist' },
    appleTrack: { id: 'song-1', name: 'Song A', artistName: 'Test Artist' },
    status: 'matched',
  },
  {
    setlistEntry: { name: 'Song A', artist: 'Test Artist' },
    appleTrack: { id: 'song-1', name: 'Song A', artistName: 'Test Artist' },
    status: 'matched',
  },
];

const baseState = {
  loading: false,
  error: null,
  addTracksError: null,
  needsAuth: false,
  created: null,
  resumeState: null,
  dedupeTracks: false,
  setDedupeTracks: vi.fn(),
  selectedSongIds: ['song-1'],
  songIds: ['song-1'],
  handleCreate: vi.fn(),
  handleAddRemainingTracks: vi.fn(),
  handleAuthorized: vi.fn(),
};

describe('CreatePlaylistView', () => {
  beforeEach(() => {
    mockUseCreatePlaylistState.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the incomplete resume branch when tracks are still pending', () => {
    mockUseCreatePlaylistState.mockReturnValue({
      ...baseState,
      resumeState: {
        status: 'incomplete',
        progress: 'exact',
        id: 'playlist-1',
        url: 'https://music.apple.com/playlist/playlist-1',
        remainingIds: ['song-2'],
        selectionSignature: '{"dedupeTracks":false,"songIds":["song-1","song-2"]}',
        storedAt: Date.now(),
      },
      selectedSongIds: ['song-1', 'song-2'],
      songIds: ['song-1', 'song-2'],
    });

    render(<CreatePlaylistView setlist={setlist} matchRows={matchRows} />);

    expect(
      screen.getByRole('heading', { name: 'Playlist created; import incomplete' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add remaining songs' })).toBeInTheDocument();
  });

  it('renders unknown add-track progress without a resume action', () => {
    mockUseCreatePlaylistState.mockReturnValue({
      ...baseState,
      resumeState: {
        status: 'incomplete',
        progress: 'unknown',
        id: 'playlist-1',
        url: 'https://music.apple.com/playlist/playlist-1',
        remainingIds: [],
        attemptedIds: ['song-1', 'song-2'],
        selectionSignature: '{"dedupeTracks":false,"songIds":["song-1","song-2"]}',
        storedAt: Date.now(),
      },
      selectedSongIds: ['song-1', 'song-2'],
      songIds: ['song-1', 'song-2'],
    });

    render(<CreatePlaylistView setlist={setlist} matchRows={matchRows} />);

    expect(screen.getByText(/Automatic resume is unavailable/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add remaining songs' })).not.toBeInTheDocument();
  });

  it('renders success copy and a safe Apple Music link after playlist creation', () => {
    mockUseCreatePlaylistState.mockReturnValue({
      ...baseState,
      created: {
        id: 'playlist-1',
        url: 'https://music.apple.com/playlist/playlist-1',
      },
    });

    render(<CreatePlaylistView setlist={setlist} matchRows={matchRows} />);

    expect(screen.getByRole('heading', { name: 'Playlist ready' })).toBeInTheDocument();
    expect(screen.getByText(/1 song added/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open in Apple Music' })).toHaveAttribute(
      'href',
      'https://music.apple.com/playlist/playlist-1'
    );
  });

  it('uses the actual sent song ID count in success copy after dedupe', () => {
    mockUseCreatePlaylistState.mockReturnValue({
      ...baseState,
      dedupeTracks: true,
      selectedSongIds: ['song-1', 'song-1'],
      songIds: ['song-1'],
      created: {
        id: 'playlist-1',
        url: 'https://music.apple.com/playlist/playlist-1',
      },
    });

    render(<CreatePlaylistView setlist={setlist} matchRows={duplicateMatchRows} />);

    expect(screen.getByText(/1 song added/)).toBeInTheDocument();
    expect(screen.queryByText(/2 songs added/)).not.toBeInTheDocument();
  });

  it('wires the create action when Apple Music authorization is not required', async () => {
    const handleCreate = vi.fn();
    mockUseCreatePlaylistState.mockReturnValue({
      ...baseState,
      handleCreate,
    });

    render(<CreatePlaylistView setlist={setlist} matchRows={matchRows} />);

    expect(screen.getByRole('list', { name: 'Selected songs' })).toHaveTextContent('Song A');
    expect(screen.getByRole('region', { name: 'Apple Music playlist creation' })).toHaveTextContent(
      'Connected'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Create playlist' }));
    expect(handleCreate).toHaveBeenCalledOnce();
  });

  it('wires the authorization callback when Apple Music authorization is required', async () => {
    const handleAuthorized = vi.fn();
    mockUseCreatePlaylistState.mockReturnValue({
      ...baseState,
      needsAuth: true,
      handleAuthorized,
    });

    render(<CreatePlaylistView setlist={setlist} matchRows={matchRows} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Connect Apple Music and create playlist' })
    );
    expect(handleAuthorized).toHaveBeenCalledOnce();
  });
});
