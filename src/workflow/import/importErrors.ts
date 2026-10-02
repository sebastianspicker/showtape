import {
  MAX_SETLIST_INPUT_LENGTH,
  parseSetlistIdFromInput,
  SETLIST_INPUT_MESSAGES,
} from '@/domain/setlist';
import { API_ERROR, type ApiFailure } from '@/contracts/api';

export interface ImportError {
  message: string;
  code: 'invalid-input' | 'not-found' | 'rate-limit' | 'service' | 'network' | 'unknown';
  retryable: boolean;
  retryAfterSeconds?: number;
}

function rateLimitError(failure: ApiFailure): ImportError {
  return {
    message: failure.message,
    code: 'rate-limit',
    retryable: true,
    retryAfterSeconds: failure.retryAfterSeconds,
  };
}

export function classifyImportError(failure: ApiFailure): ImportError {
  if (failure.code === API_ERROR.NOT_FOUND || failure.status === 404)
    return { message: failure.message, code: 'not-found', retryable: false };
  if (failure.code === API_ERROR.RATE_LIMIT || failure.status === 429)
    return rateLimitError(failure);
  if (
    failure.code === API_ERROR.SERVICE_UNAVAILABLE ||
    failure.code === API_ERROR.INTERNAL ||
    failure.status >= 500
  )
    return { message: failure.message, code: 'service', retryable: true };
  if (failure.code === API_ERROR.BAD_REQUEST || failure.status === 400)
    return { message: failure.message, code: 'invalid-input', retryable: false };
  return { message: failure.message, code: 'unknown', retryable: false };
}

export function networkImportError(message: string): ImportError {
  return { message, code: 'network', retryable: true };
}

export function getInvalidInputError(value: string): ImportError | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return {
      message: 'Enter a setlist.fm URL or setlist ID.',
      code: 'invalid-input',
      retryable: false,
    };
  }
  if (trimmed.length > MAX_SETLIST_INPUT_LENGTH) {
    return {
      message: SETLIST_INPUT_MESSAGES.INPUT_TOO_LONG,
      code: 'invalid-input',
      retryable: false,
    };
  }
  if (!parseSetlistIdFromInput(trimmed)) {
    return {
      message: 'Enter a valid setlist.fm URL or a 4–12 character hexadecimal setlist ID.',
      code: 'invalid-input',
      retryable: false,
    };
  }
  return null;
}

export function isAbortError(value: unknown): boolean {
  return value instanceof DOMException && value.name === 'AbortError';
}

/** Shown when loading rejects unexpectedly instead of resolving with a classified failure. */
export const LOAD_FAILURE: ImportError = {
  message: 'Unable to load the setlist. Please try again.',
  code: 'unknown',
  retryable: true,
};

/** The error text shown to the user, including any server-provided wait clamped to 1–60 s. */
export function formatImportError(error: ImportError | null): string | null {
  if (!error) return null;
  const { message, retryAfterSeconds } = error;
  return message && retryAfterSeconds && Number.isFinite(retryAfterSeconds)
    ? `${message} Please wait ${Math.min(60, Math.max(1, Math.ceil(retryAfterSeconds)))} seconds before retrying.`
    : message;
}
