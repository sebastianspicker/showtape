import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  collectArtifact,
  validateArtifact,
  inlineHashes,
  REQUIRED_DOCUMENTS,
  buildCsp,
} from '../../src/server/security/csp-artifact.mjs';

describe('CSP artifact', () => {
  it('binds a deduplicated manifest to build ID and exact static documents', () => {
    const dir = mkdtempSync(join(tmpdir(), 'showtape-csp-'));
    try {
      for (const path of REQUIRED_DOCUMENTS) {
        mkdirSync(dirname(join(dir, path)), { recursive: true });
        writeFileSync(
          join(dir, path),
          '<script>self.test=1</script><script src="/app.js"></script>'
        );
      }
      writeFileSync(join(dir, 'BUILD_ID'), 'test-build');
      const artifact = collectArtifact(dir);
      expect(artifact.hashes).toHaveLength(1);
      expect(Buffer.byteLength(buildCsp('0'.repeat(32), artifact.hashes))).toBeLessThan(8192);
      writeFileSync(join(dir, 'csp-manifest.json'), JSON.stringify(artifact));
      expect(validateArtifact(dir)).toEqual(artifact.hashes);
      writeFileSync(join(dir, 'BUILD_ID'), 'other-build');
      expect(() => validateArtifact(dir)).toThrow('mismatch');
      writeFileSync(join(dir, 'BUILD_ID'), 'test-build');
      // A running server's response cache must not invalidate the immutable build.
      const runtimeCopy = join(dir, 'server/route-cache/APP_PAGE/0123/$/index.html');
      mkdirSync(dirname(runtimeCopy), { recursive: true });
      writeFileSync(runtimeCopy, '<script>self.test=1</script><!-- rendered later -->');
      expect(validateArtifact(dir)).toEqual(artifact.hashes);
      writeFileSync(join(dir, REQUIRED_DOCUMENTS[0]!), '<script>changed()</script>');
      expect(() => validateArtifact(dir)).toThrow('mismatch');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it('rejects missing artifacts, malformed scripts, static nonces and event attributes', () => {
    expect(() => validateArtifact('/nonexistent-showtape-artifact')).toThrow();
    expect(() => inlineHashes('<script>unterminated')).toThrow();
    expect(() => inlineHashes('<script nonce="fixed">x()</script>')).toThrow();
    expect(() => inlineHashes('<button onclick="x()">X</button>')).toThrow();
  });
});
