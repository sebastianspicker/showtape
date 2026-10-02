const isErrorLike = (value: unknown): value is { message: string } =>
  value != null &&
  typeof value === 'object' &&
  'message' in value &&
  typeof (value as { message: unknown }).message === 'string';

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (isErrorLike(error)) return error.message;
  return error != null ? String(error) : fallback;
}
