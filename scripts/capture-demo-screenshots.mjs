import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, '..');
const artifactDirectory = path.join(rootDirectory, 'dist/pages');
const outputDirectory = path.join(rootDirectory, 'docs/screenshots');

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
]);

const desktopViewport = { width: 1280, height: 900 };
const narrowViewport = { width: 390, height: 844 };

async function startStaticServer(directory) {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1');
      const relative = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname);
      const resolved = path.join(directory, relative.replace(/^\/+/, ''));
      if (!resolved.startsWith(`${directory}${path.sep}`)) {
        response.writeHead(403).end();
        return;
      }
      const body = await readFile(resolved);
      response.writeHead(200, {
        'content-type': contentTypes.get(path.extname(resolved)) ?? 'application/octet-stream',
      });
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { server, port: server.address().port };
}

function buildArtifact() {
  const result = spawnSync(process.execPath, ['scripts/build-pages-demo.mjs'], {
    cwd: rootDirectory,
    stdio: 'inherit',
  });
  if (result.status !== 0) throw new Error('Building the static demo failed.');
}

async function freezeMotion(page) {
  await page.addStyleTag({
    content:
      '*{transition:none!important;animation:none!important;caret-color:transparent!important}*:focus{outline:none!important}',
  });
}

async function captureStages(page, baseUrl, captures) {
  for (const { file, action, heading, fullPage = true } of captures) {
    if (action) await action();
    await page.getByRole('heading', { name: heading, exact: true }).waitFor();
    await page.screenshot({ path: path.join(outputDirectory, file), fullPage });
  }
}

async function captureDesktop(browser, baseUrl) {
  const context = await browser.newContext({
    viewport: desktopViewport,
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: 'load' });
  await freezeMotion(page);
  await captureStages(page, baseUrl, [
    { file: '01-import.png', heading: 'Import a setlist' },
    {
      file: '02-preview.png',
      action: () => page.getByRole('button', { name: 'Load setlist' }).click(),
      heading: 'Review setlist',
    },
    {
      file: '03-match.png',
      action: () => page.getByRole('button', { name: 'Match songs', exact: true }).click(),
      heading: 'Confirm each song',
    },
    {
      file: '04-export.png',
      action: () => page.getByRole('button', { name: 'Review playlist' }).click(),
      heading: 'Finish local preview',
    },
    {
      file: '05-success.png',
      action: () => page.getByRole('button', { name: 'Create local preview' }).click(),
      heading: 'Your local playlist preview is ready.',
    },
  ]);
  await context.close();
}

async function captureNarrow(browser, baseUrl) {
  const context = await browser.newContext({
    viewport: narrowViewport,
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: 'load' });
  await freezeMotion(page);
  await captureStages(page, baseUrl, [
    {
      file: 'responsive-390.png',
      action: async () => {
        await page.getByRole('button', { name: 'Load setlist' }).click();
        await page.getByRole('button', { name: 'Match songs', exact: true }).click();
        await page.evaluate(() => window.scrollTo(0, 0));
      },
      heading: 'Confirm each song',
      fullPage: false,
    },
  ]);
  await context.close();
}

buildArtifact();
await mkdir(outputDirectory, { recursive: true });
const { server, port } = await startStaticServer(artifactDirectory);
const browser = await chromium.launch();

try {
  const baseUrl = `http://127.0.0.1:${port}/`;
  await captureDesktop(browser, baseUrl);
  await captureNarrow(browser, baseUrl);
  console.log(`Captured demo screenshots in ${path.relative(rootDirectory, outputDirectory)}.`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
