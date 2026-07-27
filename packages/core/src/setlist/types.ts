export interface SetlistEntry {
  /** Track name as on setlist (e.g. "Song Name (live)") */
  name: string;
  /** Artist name for this setlist */
  artist?: string;
  /** Optional info e.g. "acoustic" */
  info?: string;
}

export interface Setlist {
  /** Setlist ID from setlist.fm */
  id: string;
  /** Artist name */
  artist: string;
  /** Venue name */
  venue?: string;
  /** Event date (ISO or display) */
  eventDate?: string;
  /** setlist.fm attribution URL supplied by the upstream response */
  sourceUrl?: string;
  /** Ordered list of tracks/songs */
  sets: SetlistEntry[][];
}

export const SETLIST_FM_ATTRIBUTION_FALLBACK_URL = 'https://www.setlist.fm/';
