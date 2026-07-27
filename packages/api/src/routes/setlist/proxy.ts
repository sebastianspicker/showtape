import { parseSetlistIdFromInput } from '@repo/core';
import { API_ERROR, type Result, SETLIST_MESSAGES, type ApiErrorPayload } from '@repo/shared';
import { fetchSetlistFromApi } from '../../lib/setlistfm.js';

/** Success: body for JSON response. Error: status and message for client. */
export type SetlistProxyResult = Result<
  { body: unknown },
  { status: number; error: ApiErrorPayload }
>;

const MAX_ERROR_MESSAGE_LENGTH = 500;

const normalizeUpstreamStatus = (status: number): number => {
  if (status === 404) return 404;
  if (status >= 500) return 503;
  return status;
};

const apiErrorCodeForStatus = (status: number): NonNullable<ApiErrorPayload['code']> => {
  if (status === 404) return API_ERROR.NOT_FOUND;
  if (status === 429) return API_ERROR.RATE_LIMIT;
  if (status >= 500) return API_ERROR.SERVICE_UNAVAILABLE;
  return API_ERROR.BAD_REQUEST;
};

const limitErrorMessage = (message: string): string => {
  if (message.length <= MAX_ERROR_MESSAGE_LENGTH) return message;
  return `${message.slice(0, MAX_ERROR_MESSAGE_LENGTH)}…`;
};

/**
 * Proxy request to setlist.fm: accept setlist ID or URL, return setlist JSON or error.
 * API key is read from env and never sent to the client.
 */
export async function handleSetlistProxy(setlistIdOrUrl: string): Promise<SetlistProxyResult> {
  const apiKey = process.env.SETLISTFM_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      error: {
        status: 503,
        error: {
          error: 'SETLISTFM_API_KEY is not set. Copy .env.example to .env and add your key.',
          code: API_ERROR.SERVICE_UNAVAILABLE,
        },
      },
    };
  }

  const setlistId = parseSetlistIdFromInput(setlistIdOrUrl);
  if (!setlistId) {
    return {
      ok: false,
      error: {
        status: 400,
        error: { error: SETLIST_MESSAGES.INVALID_ID_OR_URL, code: API_ERROR.BAD_REQUEST },
      },
    };
  }

  const fetchResult = await fetchSetlistFromApi(setlistId, apiKey);

  if (fetchResult.ok) {
    return { ok: true, value: { body: fetchResult.body } };
  }

  const status = normalizeUpstreamStatus(fetchResult.status);
  const message = limitErrorMessage(fetchResult.message);
  const code = apiErrorCodeForStatus(fetchResult.status);

  return {
    ok: false,
    error: { status, error: { error: message, code } },
  };
}
