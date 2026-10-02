import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

const nextDir = path.resolve(process.cwd(), '.next');

test('keeps MusicKit and catalog search out of the first-load scripts', () => {
  const html = readFileSync(path.join(nextDir, 'server/app/index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map((match) =>
    decodeURIComponent((match[1] ?? '').split('?')[0] ?? '')
  );
  expect(scripts.length).toBeGreaterThan(0);

  for (const src of scripts) {
    expect(src.startsWith('/_next/static/')).toBe(true);
    const source = readFileSync(path.join(nextDir, src.slice('/_next/'.length)), 'utf8');
    expect(source, src).not.toContain('js-cdn.music.apple.com/musickit');
    expect(source, src).not.toContain('/v1/catalog/');
  }
});
