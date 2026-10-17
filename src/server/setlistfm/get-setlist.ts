import { API_ERROR, type ApiErrorPayload, type Result } from '@/contracts/api';
import { parseSetlistIdFromInput, SETLIST_INPUT_MESSAGES } from '@/domain/setlist';
import type { Setlist } from '@/domain/setlist';
import { fetchSetlistFromApi } from './client';

export type GetSetlistResult = Result<Setlist, { status: number; error: ApiErrorPayload }>;

export async function getSetlist(input: string, apiKey: string): Promise<GetSetlistResult> {
  const id = parseSetlistIdFromInput(input);
  if (!id)
    return {
      ok: false,
      error: {
        status: 400,
        error: { error: SETLIST_INPUT_MESSAGES.INVALID_ID_OR_URL, code: API_ERROR.BAD_REQUEST },
      },
    };
  const result = await fetchSetlistFromApi(id, apiKey);
  if (result.ok) return { ok: true, value: result.setlist };
  // 401/403 mean the server's key was rejected, not the user's input: treat it as an outage.
  if (result.status === 401 || result.status === 403)
    return {
      ok: false,
      error: {
        status: 503,
        error: {
          error: `setlist.fm rejected the configured API key (HTTP ${result.status}).`,
          code: API_ERROR.SERVICE_UNAVAILABLE,
        },
      },
    };
  const status = result.status === 404 ? 404 : result.status >= 500 ? 503 : result.status;
  const code =
    result.status === 404
      ? API_ERROR.NOT_FOUND
      : result.status === 429
        ? API_ERROR.RATE_LIMIT
        : result.status >= 500
          ? API_ERROR.SERVICE_UNAVAILABLE
          : API_ERROR.BAD_REQUEST;
  return {
    ok: false,
    error: {
      status,
      error: {
        error: result.message.length > 500 ? `${result.message.slice(0, 500)}…` : result.message,
        code,
        ...(result.retryAfterSeconds === undefined
          ? {}
          : { retryAfterSeconds: result.retryAfterSeconds }),
      },
    },
  };
}
