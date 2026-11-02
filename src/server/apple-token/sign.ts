import { createPrivateKey, sign, type KeyObject } from 'node:crypto';

let cachedPrivateKey: { normalizedPem: string; key: KeyObject } | undefined;

function privateKeyFromPem(privateKeyPem: string): KeyObject {
  const normalizedPem = privateKeyPem
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  if (cachedPrivateKey?.normalizedPem === normalizedPem) return cachedPrivateKey.key;

  const key = createPrivateKey({ key: normalizedPem, format: 'pem' });
  // Any other key would sign here and fail only at Apple.
  if (key.asymmetricKeyType !== 'ec' || key.asymmetricKeyDetails?.namedCurve !== 'prime256v1') {
    throw new Error('APPLE_PRIVATE_KEY must be a P-256 (ES256) private key.');
  }
  cachedPrivateKey = { normalizedPem, key };
  return key;
}

const base64UrlJson = (value: object): string =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

/**
 * Signs Apple's ES256 developer token for one hour. With `origins`, Apple accepts the token only
 * from those browser origins, so another website cannot reuse it.
 */
export function signDeveloperToken({
  teamId,
  keyId,
  privateKeyPem,
  origins,
}: {
  teamId: string;
  keyId: string;
  privateKeyPem: string;
  origins?: readonly string[] | null;
}): string {
  const key = privateKeyFromPem(privateKeyPem);
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64UrlJson({ alg: 'ES256', kid: keyId });
  const payload = base64UrlJson({
    iss: teamId,
    iat: issuedAt,
    exp: issuedAt + 3600,
    ...(origins?.length ? { origin: origins } : {}),
  });
  // JWS ES256 needs the raw r||s signature, not Node's default DER encoding.
  const signature = sign('sha256', Buffer.from(`${header}.${payload}`), {
    key,
    dsaEncoding: 'ieee-p1363',
  });
  return `${header}.${payload}.${signature.toString('base64url')}`;
}
