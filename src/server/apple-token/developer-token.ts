import type { DevTokenResponse } from '@/contracts/api';
import type { AppleSigningConfig } from '../config';
import { signDeveloperToken } from './sign';

export async function issueDeveloperToken(
  credentials: AppleSigningConfig
): Promise<DevTokenResponse> {
  if (!credentials.ok) {
    return {
      error: `Missing env var(s): ${credentials.missing.join(', ')}. Copy .env.example to .env and fill them in.`,
    };
  }
  try {
    return { token: await signDeveloperToken(credentials) };
  } catch (error) {
    console.error('Apple Developer Token signing failed:', {
      teamId: credentials.teamId,
      keyId: credentials.keyId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { error: 'Token signing failed. Check server configuration and logs.' };
  }
}
