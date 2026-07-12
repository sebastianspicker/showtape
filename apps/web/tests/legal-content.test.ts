import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderPrivacyMarkdown, renderTermsMarkdown } from '../src/content/legal';

describe('public legal content', () => {
  it('keeps the generated Markdown synchronized with the public routes', () => {
    const repoRoot = resolve(process.cwd(), '../..');
    expect(readFileSync(resolve(repoRoot, 'PRIVACY.md'), 'utf8')).toBe(renderPrivacyMarkdown());
    expect(readFileSync(resolve(repoRoot, 'TERMS.md'), 'utf8')).toBe(renderTermsMarkdown());
  });
});
