export const API_ERROR = {
  RATE_LIMIT: 'RATE_LIMIT',
  NOT_FOUND: 'NOT_FOUND',
  BAD_REQUEST: 'BAD_REQUEST',
  INTERNAL: 'INTERNAL',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  UNKNOWN: 'UNKNOWN',
} as const;

export type ApiErrorCode = (typeof API_ERROR)[keyof typeof API_ERROR];
export interface ApiErrorPayload {
  error: string;
  code?: ApiErrorCode;
  retryAfterSeconds?: number;
}
export interface ApiFailure {
  status: number;
  code: ApiErrorCode;
  message: string;
  retryAfterSeconds?: number;
}
export type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E };
export const isOk = <T, E>(result: Result<T, E>): result is { ok: true; value: T } => result.ok;
export const isErr = <T, E>(result: Result<T, E>): result is { ok: false; error: E } => !result.ok;

export type DevTokenResponse = { token: string } | { error: string; code?: ApiErrorCode };
export const isDevTokenSuccess = (data: DevTokenResponse): data is { token: string } =>
  'token' in data && typeof data.token === 'string';
