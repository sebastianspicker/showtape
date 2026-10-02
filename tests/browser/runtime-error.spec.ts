import { test, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { appendFile, cp, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

test('runtime-rendered error documents hydrate with the forwarded nonce', async ({ page }) => {
  test.setTimeout(90_000);
  const root = process.cwd();
  const directory = await mkdtemp(join(tmpdir(), 'showtape-runtime-test-'));
  try {
    await cp(join(root, '.next'), join(directory, '.next'), {
      recursive: true,
      filter: (source) => !source.includes(join('.next', 'cache')),
    });
    await symlink(join(root, 'node_modules'), join(directory, 'node_modules'));
    await writeFile(join(directory, 'package.json'), '{"private":true}');
    // Deliberately alter only an isolated test copy. This also guards the pinned
    // Next loader shape used to exercise an error after streaming has begun.
    await appendFile(
      join(directory, '.next/server/app/page.js'),
      '\nmodule.exports.routeModule.userland.loaderTree[1].children[2].page[0] = async () => ({ default: function RuntimeFailure() { throw new Error("Isolated render failure"); } });\n'
    );
    const prerenderPath = join(directory, '.next/prerender-manifest.json');
    const prerender = JSON.parse(await readFile(prerenderPath, 'utf8'));
    delete prerender.routes['/'];
    await writeFile(prerenderPath, JSON.stringify(prerender));
    const server = spawn(
      process.execPath,
      [
        resolve('node_modules/next/dist/bin/next'),
        'start',
        '--hostname',
        '127.0.0.1',
        '--port',
        '3203',
      ],
      { cwd: directory, env: { ...process.env, NODE_ENV: 'production' }, stdio: 'ignore' }
    );
    try {
      await expect
        .poll(
          async () => {
            try {
              return (await fetch('http://127.0.0.1:3203/privacy')).status;
            } catch {
              return 0;
            }
          },
          { timeout: 30_000 }
        )
        .toBe(200);
      await page.addInitScript(() => {
        Object.assign(window, { blockedRuntimeScripts: [] });
        document.addEventListener('securitypolicyviolation', (event) => {
          if (event.effectiveDirective.startsWith('script-src')) {
            (window as unknown as { blockedRuntimeScripts: string[] }).blockedRuntimeScripts.push(
              event.blockedURI
            );
          }
        });
      });
      const response = await page.goto('http://127.0.0.1:3203/');
      const nonce = response!.headers()['x-nonce'];
      expect(nonce).toBeTruthy();
      expect(response!.headers()['cache-control']).toContain('no-store');
      expect(await response!.text()).toContain(`nonce="${nonce}"`);
      await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
      expect(
        await page.evaluate(
          () => (window as unknown as { blockedRuntimeScripts: string[] }).blockedRuntimeScripts
        )
      ).toEqual([]);
      await page.goto('http://127.0.0.1:3203/privacy');
      await expect(page.getByRole('heading', { name: /privacy/i }).first()).toBeVisible();
    } finally {
      server.kill('SIGTERM');
      await new Promise<void>((done) => {
        if (server.exitCode !== null) done();
        else server.once('exit', () => done());
      });
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
