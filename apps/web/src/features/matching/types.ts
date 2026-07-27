import type { SetlistEntry } from '@repo/core';
import type { AppleMusicTrack } from '@/lib/musickit';

export interface MatchRow {
  setlistEntry: SetlistEntry;
  appleTrack: AppleMusicTrack | null;
  status: 'pending' | 'matched' | 'unmatched' | 'skipped';
}
