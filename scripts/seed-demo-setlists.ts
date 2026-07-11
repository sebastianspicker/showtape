/**
 * Seed demo setlists for local development and tests.
 * Fetches a few known setlist IDs from setlist.fm and saves them as JSON fixtures.
 *
 * Usage:
 *   SETLISTFM_API_KEY=your_key npx tsx scripts/seed-demo-setlists.ts
 *
 * Writes to scripts/fixtures/demo-setlists.json (create fixtures dir if needed).
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SETLIST_FM_BASE_URL = 'https://api.setlist.fm/rest/1.0';

interface SeedFileAccess {
  exists: typeof existsSync;
  mkdir: typeof mkdirSync;
  writeFile: typeof writeFileSync;
}

const NODE_FILE_ACCESS: SeedFileAccess = {
  exists: existsSync,
  mkdir: mkdirSync,
  writeFile: writeFileSync,
};

/** Known setlist IDs used in docs and tests (e.g. 63de4613). */
const DEMO_SETLIST_IDS = ['63de4613'];

interface SeedDemoSetlistsOptions {
  apiKey: string;
  ids?: readonly string[];
  fixturesDir?: string;
  fetchImpl?: typeof fetch;
}

interface SeedDemoSetlistsResult {
  count: number;
  outPath: string;
}

export async function fetchSetlist(
  setlistId: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch
): Promise<unknown> {
  const url = `${SETLIST_FM_BASE_URL}/setlist/${encodeURIComponent(setlistId)}`;
  const res = await fetchImpl(url, {
    headers: { 'x-api-key': apiKey, Accept: 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`setlist.fm ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<unknown>;
}

export async function seedDemoSetlists({
  apiKey,
  ids = DEMO_SETLIST_IDS,
  fixturesDir = join(__dirname, 'fixtures'),
  fetchImpl = fetch,
}: SeedDemoSetlistsOptions): Promise<SeedDemoSetlistsResult> {
  const trimmedApiKey = apiKey.trim();
  if (!trimmedApiKey) {
    throw new Error('Set SETLISTFM_API_KEY to run this script.');
  }

  const out: Record<string, unknown> = {};
  const failures: string[] = [];
  for (const id of ids) {
    try {
      const body = await fetchSetlist(id, trimmedApiKey, fetchImpl);
      out[id] = body;
      console.log(`Fetched setlist ${id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failures.push(`${id}: ${message}`);
      console.warn(`Skip setlist ${id}:`, message);
    }
  }

  const outPath = join(fixturesDir, 'demo-setlists.json');
  const count = Object.keys(out).length;
  if (count === 0) {
    throw new Error(
      `No demo setlists fetched; refusing to write ${outPath}. Last errors: ${failures.join('; ')}`
    );
  }

  if (!NODE_FILE_ACCESS.exists(fixturesDir)) {
    NODE_FILE_ACCESS.mkdir(fixturesDir, { recursive: true });
  }
  NODE_FILE_ACCESS.writeFile(outPath, JSON.stringify(out, null, 2), 'utf-8');
  console.log(`Wrote ${count} setlist(s) to ${outPath}`);
  return { count, outPath };
}

async function main() {
  const apiKey = process.env.SETLISTFM_API_KEY ?? '';
  if (!apiKey) {
    console.error('Set SETLISTFM_API_KEY to run this script.');
    process.exit(1);
  }

  await seedDemoSetlists({ apiKey });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
