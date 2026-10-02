import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const REQUIRED_DOCUMENTS = [
  'server/app/index.html',
  'server/app/privacy.html',
  'server/app/terms.html',
];
export const hash = (value) => createHash('sha256').update(value).digest('base64');

export function buildCsp(nonce, hashes = [], development = false) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' ${hashes.map((value) => `'sha256-${value}'`).join(' ')} https://js-cdn.music.apple.com${development ? " 'unsafe-eval'" : ''}`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self' https://api.music.apple.com",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

// Emitted Next HTML is controlled build output. Reject unsupported extraction
// shapes instead of silently allowing an incomplete policy after an upgrade.
export function inlineHashes(html) {
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
  if (scripts.length !== (html.match(/<script\b/gi) ?? []).length)
    throw new Error('Invalid script extraction');
  if (/\son[a-z]+\s*=/i.test(html)) throw new Error('Inline event attribute in static HTML');
  return scripts.flatMap(([, attributes, body]) => {
    if (/\bnonce\s*=/i.test(attributes)) throw new Error('Static nonce in HTML');
    if (/\bsrc\s*=/i.test(attributes)) {
      if (body.trim()) throw new Error('External script with inline body');
      return [];
    }
    return [hash(body)];
  });
}

// Next's filesystem cache promotes served responses into server/route-cache at
// runtime. That is mutable process state, not part of the immutable build.
const RUNTIME_CACHE_DIRECTORY = 'server/route-cache';

export function collectArtifact(directory) {
  const files = [];
  const visit = (relative) => {
    for (const entry of readdirSync(join(directory, relative), { withFileTypes: true })) {
      const path = `${relative}/${entry.name}`;
      if (entry.isDirectory()) {
        if (path !== RUNTIME_CACHE_DIRECTORY) visit(path);
      } else if (entry.isFile() && path.endsWith('.html')) files.push(path);
    }
  };
  visit('server');
  for (const path of REQUIRED_DOCUMENTS)
    if (!files.includes(path)) throw new Error(`Missing static document: ${path}`);
  const hashes = new Set();
  const documents = {};
  for (const path of files.sort()) {
    const html = readFileSync(join(directory, path), 'utf8');
    const extracted = inlineHashes(html);
    if (REQUIRED_DOCUMENTS.includes(path) && extracted.length === 0)
      throw new Error(`No inline scripts: ${path}`);
    extracted.forEach((value) => hashes.add(value));
    documents[path] = hash(html);
  }
  const artifact = {
    schemaVersion: 1,
    buildId: readFileSync(join(directory, 'BUILD_ID'), 'utf8').trim(),
    hashes: [...hashes].sort(),
    documents,
  };
  if (!artifact.buildId || Buffer.byteLength(buildCsp('0'.repeat(32), artifact.hashes)) > 8192)
    throw new Error('Invalid build ID or CSP exceeds 8 KiB');
  return artifact;
}

export function validateArtifact(directory) {
  const manifest = JSON.parse(readFileSync(join(directory, 'csp-manifest.json'), 'utf8'));
  const expected = collectArtifact(directory);
  if (JSON.stringify(manifest) !== JSON.stringify(expected))
    throw new Error('CSP artifact mismatch');
  return Object.freeze(expected.hashes);
}
