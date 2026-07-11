/**
 * Export diagnostics for support or debugging.
 * Collects support metadata (env var names present, API base URL) and outputs JSON.
 * Secret values are excluded, but the report should still be reviewed before sharing.
 *
 * Usage:
 *   npx tsx scripts/export-diagnostics.ts
 *   mkdir -p reports && npx tsx scripts/export-diagnostics.ts --out reports/diagnostics.json
 */

import { existsSync, lstatSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, resolve, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

const ENV_PREFIXES = ['NEXT_PUBLIC_', 'APPLE_', 'SETLISTFM_', 'ALLOWED_', 'API_'];

function envVarNamesPresent(): string[] {
  const names: string[] = [];
  for (const key of Object.keys(process.env)) {
    if (ENV_PREFIXES.some((p) => key.startsWith(p))) names.push(key);
  }
  return names.sort();
}

/** Resolve --out path and ensure its real parent stays under cwd. */
export function resolveOutPath(raw: string, cwd = process.cwd()): string | null {
  const normalized = resolve(cwd, raw);
  const rel = relative(cwd, normalized);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) return null;

  try {
    if (existsSync(normalized) && lstatSync(normalized).isSymbolicLink()) return null;
    const realCwd = realpathSync(cwd);
    const realParent = realpathSync(dirname(normalized));
    const parentRel = relative(realCwd, realParent);
    if (parentRel.startsWith('..') || isAbsolute(parentRel)) return null;
    return resolve(realParent, basename(normalized));
  } catch {
    return null;
  }
}

function main() {
  const apiBase = process.env.NEXT_PUBLIC_API_URL?.trim() || 'same-origin (unset)';

  const report = {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    envVarNames: envVarNamesPresent(),
    apiBaseUrl: apiBase,
  };

  const json = JSON.stringify(report, null, 2);
  const outArg = process.argv.indexOf('--out');
  const outValue = outArg === -1 ? undefined : process.argv[outArg + 1];
  if (outValue) {
    const outPath = resolveOutPath(outValue);
    if (outPath) {
      writeFileSync(outPath, json, 'utf-8');
      console.log(`Diagnostics written to ${outPath}`);
    } else {
      console.error('Refused: --out path must resolve under current directory.');
      process.exitCode = 1;
    }
  } else {
    console.log(json);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
