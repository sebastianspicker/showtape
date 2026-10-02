import { test, expect } from '@playwright/test';

test('static documents reuse HTML with independent nonces and hydrate under CSP', async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const first = await request.get('/');
  const second = await request.get('/');
  expect(first.status()).toBe(200);
  expect(await first.text()).toBe(await second.text());
  expect(first.headers()['x-nonce']).not.toBe(second.headers()['x-nonce']);
  expect(first.headers()['cache-control']).toContain('no-store');
  expect(first.headers()['content-security-policy']).toContain("script-src-attr 'none'");
  const policy = first.headers()['content-security-policy'];
  expect(policy?.split(';').find((part) => part.trim().startsWith('script-src '))).not.toMatch(
    /unsafe-inline|unsafe-eval/
  );
  const navigation = await page.goto('/');
  await expect(page).toHaveTitle('Showtape');
  await expect(page.getByRole('textbox').first()).toBeVisible();
  await page.evaluate(() => {
    const script = document.createElement('script');
    script.textContent = 'window.__blocked = true';
    document.body.append(script);
  });
  expect(await page.evaluate(() => Object.hasOwn(window, '__blocked'))).toBe(false);
  await page.evaluate((nonce) => {
    const script = document.createElement('script');
    script.nonce = nonce!;
    script.textContent = 'window.__nonceAllowed = true';
    document.body.append(script);
  }, navigation?.headers()['x-nonce']);
  expect(await page.evaluate(() => Object.hasOwn(window, '__nonceAllowed'))).toBe(true);

  await page.getByRole('link', { name: 'Privacy', exact: true }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole('heading', { name: /privacy/i }).first()).toBeVisible();
  await page.goto('/not-a-route');
  await expect(page.getByRole('heading').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('all document routes and excluded-prefix lookalikes carry CSP', async ({ request }) => {
  for (const path of [
    '/',
    '/privacy',
    '/terms',
    '/not-a-route',
    '/favicon.ico-anything',
    '/manifest.webmanifest/missing',
    '/_next/static-anything',
    '/_next/imagefake',
    '/api/not-found',
  ]) {
    const response = await request.get(path);
    expect(response.headers()['content-type']).toContain('text/html');
    expect(response.headers()['content-security-policy']).toContain("script-src-attr 'none'");
    expect(response.headers()['cache-control']).toContain('no-store');
  }
});
