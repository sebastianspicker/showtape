import { describe, expect, it, vi } from 'vitest';
import { createSelectionSignature } from '@/domain/matching';
import {
  getAddProgress,
  isRemainingSubsetOfSelection,
  readResume,
  shouldDiscardResume,
  writeResume,
} from '@/workflow/playlist/resume';

describe('playlist resume safety', () => {
  it('keeps v1 exact resume data only for the same selection with valid remaining multiplicities', () => {
    const songIds = ['song-1', 'song-2', 'song-2'];
    const selectionSignature = createSelectionSignature(songIds, false);
    const resume = {
      status: 'incomplete' as const,
      progress: 'exact' as const,
      id: 'playlist-1',
      remainingIds: ['song-2', 'song-2'],
      selectionSignature,
      storedAt: Date.now(),
    };

    expect(isRemainingSubsetOfSelection(resume.remainingIds, songIds)).toBe(true);
    expect(shouldDiscardResume(resume, selectionSignature, songIds)).toBe(false);
    expect(shouldDiscardResume(resume, createSelectionSignature(songIds, true), songIds)).toBe(
      true
    );
  });

  it('discards stale or impossible exact progress', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_900_000);
    const signature = createSelectionSignature(['song-1'], false);
    expect(
      shouldDiscardResume(
        {
          status: 'incomplete',
          progress: 'exact',
          id: 'playlist-1',
          remainingIds: ['other-song'],
          selectionSignature: signature,
          storedAt: 0,
        },
        signature,
        ['song-1']
      )
    ).toBe(true);
    vi.restoreAllMocks();
  });
});

describe('playlist resume storage', () => {
  it('stores progress per setlist under the v1 key and normalizes it when read back', () => {
    const storage = new Map<string, string>();
    vi.stubGlobal('window', {
      sessionStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
      },
    });
    const resume = {
      status: 'incomplete' as const,
      progress: 'exact' as const,
      id: 'playlist-1',
      url: 'https://music.apple.com/library/playlist/p.1',
      remainingIds: ['song-2'],
      selectionSignature: createSelectionSignature(['song-1', 'song-2'], false),
      storedAt: 1,
    };

    writeResume('setlist-1', resume);
    expect(JSON.parse(storage.get('playlist_resume_v1:setlist-1') ?? 'null')).toEqual(resume);
    expect(readResume('setlist-1')).toEqual(resume);

    storage.set(
      'playlist_resume_v1:setlist-1',
      JSON.stringify({ ...resume, progress: 'legacy-value' })
    );
    expect(readResume('setlist-1')?.progress).toBe('exact');
    storage.set('playlist_resume_v1:setlist-1', JSON.stringify({ status: 'incomplete' }));
    expect(readResume('setlist-1')).toBeNull();

    writeResume('setlist-1', null);
    expect(storage.has('playlist_resume_v1:setlist-1')).toBe(false);
    vi.unstubAllGlobals();
  });

  it('keeps exact remaining IDs only when the failure reports them', () => {
    expect(getAddProgress({ progress: 'exact', remainingIds: ['b'] }, ['a', 'b'])).toEqual({
      progress: 'exact',
      remainingIds: ['b'],
    });
    expect(
      getAddProgress({ progress: 'unknown', remainingIds: [], attemptedIds: ['b'] }, ['a', 'b'])
    ).toEqual({ progress: 'unknown', remainingIds: [], attemptedIds: ['b'] });
    expect(getAddProgress(new Error('network'), ['a', 'b'])).toEqual({
      progress: 'unknown',
      remainingIds: [],
      attemptedIds: ['a', 'b'],
    });
  });
});
