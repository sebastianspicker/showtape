import type { DevTokenResponse } from '@/contracts/api';
import type { AppleSigningConfig } from '../config';
import { signDeveloperToken } from './sign';

export async function issueDeveloperToken(
  credentials: AppleSigningConfig,
  origins: readonly string[] | null = null
): Promise<DevTokenResponse> {
  if (!credentials.ok) {
    // Visitors only see the generic message; the setting names stay in the server log.
    console.error(
      `Apple Developer Token is not configured. Missing env var(s): ${credentials.missing.join(', ')}.`
    );
    return { error: 'Apple Music is temporarily unavailable.' };
  }
  try {
    return { token: signDeveloperToken({ ...credentials, origins }) };
  } catch (error) {
    console.error('Apple Developer Token signing failed:', {
      teamId: credentials.teamId,
      keyId: credentials.keyId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { error: 'Token signing failed. Check server configuration and logs.' };
  }
}
