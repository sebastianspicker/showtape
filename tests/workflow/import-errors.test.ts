import { describe, expect, it } from 'vitest';
import { API_ERROR } from '../../src/contracts/api';
import {
  classifyImportError,
  formatImportError,
  networkImportError,
} from '../../src/workflow/import/importErrors';

describe('setlist import errors', () => {
  it('uses structured status and code instead of English error text', () => {
    expect(
      classifyImportError({
        status: 429,
        code: API_ERROR.RATE_LIMIT,
        message: 'A translated message without classification keywords.',
        retryAfterSeconds: 9,
      })
    ).toEqual({
      message: 'A translated message without classification keywords.',
      code: 'rate-limit',
      retryable: true,
      retryAfterSeconds: 9,
    });
    expect(
      classifyImportError({
        status: 404,
        code: API_ERROR.NOT_FOUND,
        message: 'Also translated.',
      })
    ).toEqual({ message: 'Also translated.', code: 'not-found', retryable: false });
  });

  it('keeps thrown transport failures in the dedicated retryable network path', () => {
    expect(networkImportError('Connection lost.')).toEqual({
      message: 'Connection lost.',
      code: 'network',
      retryable: true,
    });
  });

  it.each([
    [17, 'Busy. Please wait 17 seconds before retrying.'],
    [0.2, 'Busy. Please wait 1 seconds before retrying.'],
    [600, 'Busy. Please wait 60 seconds before retrying.'],
    [0, 'Busy.'],
    [undefined, 'Busy.'],
  ])('shows a retry wait of %s seconds clamped to 1–60', (retryAfterSeconds, expected) => {
    expect(
      formatImportError({
        message: 'Busy.',
        code: 'rate-limit',
        retryable: true,
        retryAfterSeconds,
      })
    ).toBe(expected);
  });

  it('shows nothing without an error', () => {
    expect(formatImportError(null)).toBeNull();
  });
});
