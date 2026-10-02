import { createPrivateKey, type KeyObject } from 'node:crypto';
import { SignJWT } from 'jose';

let cachedPrivateKey: { normalizedPem: string; key: KeyObject } | undefined;

function privateKeyFromPem(privateKeyPem: string): KeyObject {
  const normalizedPem = privateKeyPem
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  if (cachedPrivateKey?.normalizedPem === normalizedPem) return cachedPrivateKey.key;

  const key = createPrivateKey({ key: normalizedPem, format: 'pem' });
  cachedPrivateKey = { normalizedPem, key };
  return key;
}

export async function signDeveloperToken({
  teamId,
  keyId,
  privateKeyPem,
}: {
  teamId: string;
  keyId: string;
  privateKeyPem: string;
}): Promise<string> {
  const key = privateKeyFromPem(privateKeyPem);
  const issuedAt = Math.floor(Date.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + 3600)
    .sign(key);
}
