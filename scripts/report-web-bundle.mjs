import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { runInNewContext } from 'node:vm';

const root = process.cwd();
const nextDir = resolve(root, 'apps/web/.next');
const buildManifest = JSON.parse(readFileSync(resolve(nextDir, 'build-manifest.json'), 'utf8'));
const clientManifestSource = readFileSync(
  resolve(nextDir, 'server/app/page_client-reference-manifest.js'),
  'utf8'
);
const sandbox = { globalThis: {} };
runInNewContext(clientManifestSource, sandbox);
const routeManifest = sandbox.globalThis.__RSC_MANIFEST?.['/page'];

if (!routeManifest) {
  throw new Error('Missing production client manifest for /. Run pnpm build first.');
}

const entryJs = routeManifest.entryJSFiles ?? {};
const entryCss = routeManifest.entryCSSFiles ?? {};
const jsFiles = new Set([
  ...(buildManifest.polyfillFiles ?? []),
  ...(buildManifest.rootMainFiles ?? []),
  ...(entryJs['[project]/apps/web/src/app/layout'] ?? []),
  ...(entryJs['[project]/apps/web/src/app/page'] ?? []),
]);
const cssFiles = new Set(
  [...(entryCss['[project]/apps/web/src/app/layout'] ?? []), ...(entryCss['[project]/apps/web/src/app/page'] ?? [])].map(
    (entry) => entry.path
  )
);

function measure(files) {
  const sortedFiles = [...files].sort();
  const assets = sortedFiles.map((file) => {
    const absolute = resolve(nextDir, file);
    const contents = readFileSync(absolute);
    return {
      file,
      rawBytes: statSync(absolute).size,
      gzipBytes: gzipSync(contents).length,
    };
  });
  return {
    files: assets,
    rawBytes: assets.reduce((total, asset) => total + asset.rawBytes, 0),
    gzipBytes: assets.reduce((total, asset) => total + asset.gzipBytes, 0),
  };
}

const report = {
  route: '/',
  source: 'Next.js production manifests after pnpm build',
  note: 'Transfer totals are gzip estimates for initial route assets and exclude HTML, RSC payloads, and network protocol overhead.',
  javascript: measure(jsFiles),
  css: measure(cssFiles),
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
