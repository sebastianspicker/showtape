export interface ResumeState {
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

export const resumeKey = (setlistId: string): string => `playlist_resume_v1:${setlistId}`;

export const isResumeState = (value: unknown): boolean => {
  if (!value || typeof value !== 'object') return false;
  const { status, id, selectionSignature, remainingIds } = value as Record<string, unknown>;
  return (
    status === 'incomplete' &&
    typeof id === 'string' &&
    Boolean(id) &&
    typeof selectionSignature === 'string' &&
    Array.isArray(remainingIds)
  );
};

export const readResume = (setlistId: string): ResumeState | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(resumeKey(setlistId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isResumeState(parsed)) return null;
    const resume = parsed as ResumeState;
    return {
      ...resume,
      progress: resume.progress === 'unknown' ? 'unknown' : 'exact',
    };
  } catch {
    return null;
  }
};

export const isResumeStale = (storedAt: number | undefined): boolean =>
  typeof storedAt === 'number' && Date.now() - storedAt > RESUME_STALE_AFTER_MS;

export const createSelectionSignature = (songIds: string[], dedupeTracks: boolean): string => {
  // Resume applies only to the exact exported sequence; otherwise retrying could add wrong tracks.
  return JSON.stringify({ dedupeTracks, songIds });
};

export const isRemainingSubsetOfSelection = (
  remainingIds: string[],
  songIds: string[]
): boolean => {
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
};

export const shouldDiscardResume = (
  stored: ResumeState,
  selectionSignature: string,
  songIds: string[]
): boolean =>
  isResumeStale(stored.storedAt) ||
  stored.selectionSignature !== selectionSignature ||
  (stored.progress === 'exact' &&
    (stored.remainingIds.length === 0 ||
      !isRemainingSubsetOfSelection(stored.remainingIds, songIds)));

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

export const getAddProgress = (
  error: unknown,
  attemptedIds: string[]
): Pick<ResumeState, 'progress' | 'remainingIds' | 'attemptedIds'> => {
  const remainingIds = (error as { remainingIds?: unknown } | null)?.remainingIds;
  const progress = (error as { progress?: unknown } | null)?.progress;
  if (
    progress !== 'unknown' &&
    isStringArray(remainingIds) &&
    remainingIds.every((id) => id.trim().length > 0)
  ) {
    return { progress: 'exact', remainingIds };
  }
  const reportedAttempts = (error as { attemptedIds?: unknown } | null)?.attemptedIds;
  return {
    progress: 'unknown',
    remainingIds: [],
    attemptedIds: isStringArray(reportedAttempts) ? reportedAttempts : attemptedIds,
  };
};

export function writeResume(setlistId: string, value: ResumeState | null): void {
  if (typeof window === 'undefined') return;
  try {
    const key = resumeKey(setlistId);
    if (!value) {
      window.sessionStorage.removeItem(key);
      return;
    }
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota and access errors because resume is optional.
  }
}
