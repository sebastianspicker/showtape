// The only place under src/server (besides security/) that reads process.env.
// Getters read lazily so tests and `next build` see the environment of the moment.

export type AppleSigningCredentials = { teamId: string; keyId: string; privateKeyPem: string };

export type AppleSigningConfig =
  ({ ok: true } & AppleSigningCredentials) | { ok: false; missing: string[] };

export function setlistFmApiKey(): string | null {
  return process.env.SETLISTFM_API_KEY?.trim() || null;
}

export function appleSigningCredentials(): AppleSigningConfig {
  const teamId = process.env.APPLE_TEAM_ID?.trim();
  const keyId = process.env.APPLE_KEY_ID?.trim();
  const privateKeyPem = process.env.APPLE_PRIVATE_KEY?.trim();
  if (teamId && keyId && privateKeyPem) return { ok: true, teamId, keyId, privateKeyPem };
  const missing = [
    ['APPLE_TEAM_ID', teamId],
    ['APPLE_KEY_ID', keyId],
    ['APPLE_PRIVATE_KEY', privateKeyPem],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name as string);
  return { ok: false, missing };
}

export function allowedOrigins(): string[] | null {
  const configured = (process.env.ALLOWED_ORIGIN ?? '').trim();
  if (!configured) return null;
  return configured
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter((origin) => Boolean(origin) && origin !== 'null' && origin !== '*');
}

export function trustProxy(): boolean {
  return process.env.TRUST_PROXY === '1';
}
