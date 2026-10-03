import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { flattenSetlistToEntries, parseSetlistIdFromInput } from '../../src/domain/setlist';
import { buildSearchQuery, normalizeTrackName } from '../../src/domain/matching';

describe('setlist domain', () => {
  it('accepts trusted IDs and rejects hostile hosts', () => {
    expect(parseSetlistIdFromInput('https://www.setlist.fm/setlist/a/b-deadbeef.html')).toBe(
      'deadbeef'
    );
    expect(
      parseSetlistIdFromInput('https://setlist.fm@evil.example/setlist/a-b-deadbeef.html')
    ).toBeNull();
  });
  it('flattens provider-independent setlist entries in their original order', () => {
    expect(
      flattenSetlistToEntries({
        id: 'deadbeef',
        artist: 'Artist',
        sets: [[{ name: 'First' }], [{ name: 'Second', artist: 'Guest' }]],
      })
    ).toEqual([
      { name: 'First', artist: 'Artist', info: undefined },
      { name: 'Second', artist: 'Guest', info: undefined },
    ]);
  });
  it('normalizes catalog queries without losing Unicode names', () => {
    expect(normalizeTrackName('Café (Live Version) feat. Guest')).toBe('Café');
    expect(buildSearchQuery('Song (Live)', 'Artist')).toBe('Song Artist');
  });
  it.each([
    ['Song - Live', 'Song'],
    ['Song - acoustic', 'Song acoustic'],
    ['A feat. B - live', 'A live'],
    ['A feat. B - live version', 'A live version'],
    ['defeat. Guest - live', 'de live'],
    ['feat. Guest', 'feat. Guest'],
    [' A feat. Guest', 'A'],
    ['A feat. B (Part II)', 'A (Part II)'],
    ['A feat. B\n(Part II)', 'A (Part II)'],
    ['A feat. B\n - live', 'A live'],
    ['A feat. B - radio   edit tail', 'A radio edit tail'],
    ['A ft Guest - REMASTERED', 'A REMASTERED'],
    ['A - 2020 remaster', 'A'],
    ['A - remaster', 'A remaster'],
    ['A feat. B - bonus track', 'A bonus track'],
    ['A feat. B - live\nversion', 'A live version'],
  ])('preserves legacy normalization for %j', (input, expected) => {
    expect(normalizeTrackName(input)).toBe(expected);
  });
  it('normalizes a hostile long name within a hard process deadline', () => {
    const matchingSource = fileURLToPath(new URL('../../src/domain/matching.ts', import.meta.url));
    const childScript = `
        const { readFileSync } = await import('node:fs');
        const ts = await import('typescript');
        const source = readFileSync(process.argv[1], 'utf8');
        const compiled = ts.transpileModule(source, {
          compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
        }).outputText;
        const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(compiled).toString('base64');
        const matching = await import(moduleUrl);
        const hostileName = ' '.repeat(200_000) + 'Song';
        if (matching.normalizeTrackName(hostileName) !== 'Song') process.exit(1);
        if (matching.buildSearchQuery(hostileName, 'Artist') !== 'Song Artist') process.exit(2);
      `;

    execFileSync(process.execPath, ['--input-type=module', '--eval', childScript, matchingSource], {
      stdio: 'pipe',
      timeout: 5_000,
    });
  }, 10_000);
});
