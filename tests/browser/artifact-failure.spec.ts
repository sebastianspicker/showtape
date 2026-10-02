import { test, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

test('production fails closed on a missing or mismatched CSP manifest', async () => {
  test.setTimeout(60_000);
  const root = process.cwd();
  const directory = await mkdtemp(join(tmpdir(), 'showtape-invalid-build-'));
  try {
    await cp(join(root, '.next'), join(directory, '.next'), {
      recursive: true,
      filter: (source) => !source.includes(`${join('.next', 'cache')}`),
    });
    await symlink(join(root, 'node_modules'), join(directory, 'node_modules'));
    await writeFile(join(directory, 'package.json'), '{"private":true}');
    const manifestPath = join(directory, '.next/csp-manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    await rm(manifestPath);
    for (const mode of ['missing', 'mismatched']) {
      if (mode === 'mismatched') {
        await writeFile(manifestPath, JSON.stringify({ ...manifest, buildId: 'wrong-build' }));
      }
      const server = spawn(
        process.execPath,
        [
          resolve('node_modules/next/dist/bin/next'),
          'start',
          directory,
          '--hostname',
          '127.0.0.1',
          '--port',
          '3201',
        ],
        {
          cwd: directory,
          env: { ...process.env, NODE_ENV: 'production' },
          stdio: 'pipe',
        }
      );
      try {
        await expect
          .poll(
            async () => {
              try {
                return (await fetch('http://127.0.0.1:3201')).status;
              } catch {
                return 0;
              }
            },
            { timeout: 15_000 }
          )
          .toBe(503);
        const response = await fetch('http://127.0.0.1:3201');
        expect(response.headers.get('cache-control')).toContain('no-store');
        expect(response.headers.get('content-security-policy')).toContain("default-src 'none'");
        expect(await response.text()).not.toContain('<script');
      } finally {
        server.kill('SIGTERM');
        await new Promise<void>((done) => {
          if (server.exitCode !== null) done();
          else server.once('exit', () => done());
        });
      }
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
