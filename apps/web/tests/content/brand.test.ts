import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { metadata } from '../../src/app/layout';
import { PRODUCT_DESCRIPTION, PRODUCT_NAME, PRODUCT_TAGLINE } from '../../src/content/brand';

describe('Showtape identity', () => {
  const repoRoot = resolve(process.cwd(), '../..');

  it('keeps the canonical product identity in page metadata', () => {
    expect(PRODUCT_NAME).toBe('Showtape');
    expect(PRODUCT_TAGLINE).toBe('Create an Apple Music playlist from a setlist.fm setlist.');
    expect(metadata).toMatchObject({
      title: PRODUCT_NAME,
      description: PRODUCT_DESCRIPTION,
      openGraph: {
        title: PRODUCT_NAME,
        description: PRODUCT_DESCRIPTION,
        siteName: PRODUCT_NAME,
      },
      twitter: {
        title: PRODUCT_NAME,
        description: PRODUCT_DESCRIPTION,
      },
      appleWebApp: { title: PRODUCT_NAME },
    });
  });

  it('keeps package and install metadata aligned with Showtape', () => {
    const rootPackage = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8'));
    const manifest = JSON.parse(
      readFileSync(resolve(repoRoot, 'apps/web/public/manifest.webmanifest'), 'utf8')
    );

    expect(rootPackage.name).toBe('showtape');
    expect(manifest).toMatchObject({
      name: PRODUCT_NAME,
      short_name: PRODUCT_NAME,
      description: PRODUCT_DESCRIPTION,
    });
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ src: '/icons/icon-maskable-192.png', purpose: 'maskable' }),
        expect.objectContaining({ src: '/icons/icon-maskable-512.png', purpose: 'maskable' }),
      ])
    );
  });
});
