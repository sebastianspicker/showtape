import { generateKeyPairSync } from 'node:crypto';
import { decodeProtectedHeader, jwtVerify } from 'jose';
import { afterEach, describe, expect, it } from 'vitest';
import { issueDeveloperToken } from '../../src/server/apple-token/developer-token';
import { appleSigningCredentials } from '../../src/server/config';

const handleDevToken = () => issueDeveloperToken(appleSigningCredentials());

const originalEnvironment = {
  APPLE_TEAM_ID: process.env.APPLE_TEAM_ID,
  APPLE_KEY_ID: process.env.APPLE_KEY_ID,
  APPLE_PRIVATE_KEY: process.env.APPLE_PRIVATE_KEY,
};

afterEach(() => {
  for (const [name, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

describe('Apple developer token boundary', () => {
  it('reports every missing signing setting without attempting a token', async () => {
    delete process.env.APPLE_TEAM_ID;
    delete process.env.APPLE_KEY_ID;
    delete process.env.APPLE_PRIVATE_KEY;

    await expect(handleDevToken()).resolves.toEqual({
      error:
        'Missing env var(s): APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY. Copy .env.example to .env and fill them in.',
    });
  });

  it('issues a verifiable ES256 token that lasts exactly one hour', async () => {
    const keys = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    process.env.APPLE_TEAM_ID = 'TEAM123';
    process.env.APPLE_KEY_ID = 'KEY456';
    process.env.APPLE_PRIVATE_KEY = keys.privateKey
      .export({ format: 'pem', type: 'pkcs8' })
      .toString();

    const result = await handleDevToken();
    expect('token' in result).toBe(true);
    if (!('token' in result)) return;

    const verified = await jwtVerify(result.token, keys.publicKey, { issuer: 'TEAM123' });
    expect(decodeProtectedHeader(result.token)).toMatchObject({ alg: 'ES256', kid: 'KEY456' });
    expect(verified.payload.exp! - verified.payload.iat!).toBe(3600);
  });

  it('reuses a normalized private key while issuing fresh tokens', async () => {
    const keys = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const privateKey = keys.privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
    process.env.APPLE_TEAM_ID = 'TEAM123';
    process.env.APPLE_KEY_ID = 'KEY456';
    process.env.APPLE_PRIVATE_KEY = privateKey.replace(/\n/g, '\\n');

    const first = await handleDevToken();
    process.env.APPLE_PRIVATE_KEY = privateKey.replace(/\n/g, '\r\n');
    const second = await handleDevToken();

    expect('token' in first && 'token' in second).toBe(true);
    if (!('token' in first) || !('token' in second)) return;
    await expect(jwtVerify(first.token, keys.publicKey)).resolves.toBeDefined();
    await expect(jwtVerify(second.token, keys.publicKey)).resolves.toBeDefined();
    expect(first.token).not.toBe(second.token);
  });

  it('invalidates the parsed-key cache when the normalized PEM changes', async () => {
    const firstKeys = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const secondKeys = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    process.env.APPLE_TEAM_ID = 'TEAM123';
    process.env.APPLE_KEY_ID = 'KEY456';
    process.env.APPLE_PRIVATE_KEY = firstKeys.privateKey
      .export({ format: 'pem', type: 'pkcs8' })
      .toString();
    await handleDevToken();

    process.env.APPLE_PRIVATE_KEY = secondKeys.privateKey
      .export({ format: 'pem', type: 'pkcs8' })
      .toString();
    const result = await handleDevToken();

    expect('token' in result).toBe(true);
    if (!('token' in result)) return;
    await expect(jwtVerify(result.token, secondKeys.publicKey)).resolves.toBeDefined();
    await expect(jwtVerify(result.token, firstKeys.publicKey)).rejects.toThrow();
  });
});
