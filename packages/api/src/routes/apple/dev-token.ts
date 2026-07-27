import type { DevTokenResponse } from '@repo/shared';
import { signDeveloperToken } from '../../lib/jwt.js';

export type { DevTokenResponse };

interface AppleTokenConfig {
  teamId: string;
  keyId: string;
  privateKey: string;
}

type AppleTokenConfigResult =
  | { ok: true; value: AppleTokenConfig }
  | { ok: false; missing: string[] };

const readAppleTokenConfig = (): AppleTokenConfigResult => {
  const values = {
    teamId: process.env.APPLE_TEAM_ID?.trim(),
    keyId: process.env.APPLE_KEY_ID?.trim(),
    privateKey: process.env.APPLE_PRIVATE_KEY?.trim(),
  };
  const missing: string[] = [];
  if (!values.teamId) missing.push('APPLE_TEAM_ID');
  if (!values.keyId) missing.push('APPLE_KEY_ID');
  if (!values.privateKey) missing.push('APPLE_PRIVATE_KEY');
  if (missing.length > 0) return { ok: false, missing };
  return { ok: true, value: values as AppleTokenConfig };
};

/**
 * Mint Apple Developer Token (JWT) for MusicKit.
 * Reads APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY from env.
 * Returns { error } with a clear message if env is missing or signing fails.
 */
export async function handleDevToken(): Promise<DevTokenResponse> {
  const config = readAppleTokenConfig();
  if (!config.ok) {
    return {
      error: `Missing env var(s): ${config.missing.join(', ')}. Copy .env.example to .env and fill them in.`,
    };
  }

  const { teamId, keyId, privateKey } = config.value;
  try {
    const token = await signDeveloperToken({
      teamId,
      keyId,
      privateKeyPem: privateKey,
    });
    return { token };
  } catch (err) {
    // Log signing error safely on the server. Do NOT log the privateKey itself.
    console.error('Apple Developer Token signing failed:', {
      teamId,
      keyId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { error: 'Token signing failed. Check server configuration and logs.' };
  }
}
