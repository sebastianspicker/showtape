import { expect, test } from '@playwright/test';

test('meets the local production LCP and CLS targets @performance', async ({ page }, testInfo) => {
  test.skip(process.env.PLAYWRIGHT_PRODUCTION !== '1', 'Production lab only');

  await page.addInitScript(() => {
    const vitals = { cls: 0, lcp: 0 };
    Object.defineProperty(window, '__publicAlphaVitals', { value: vitals, writable: false });

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        vitals.lcp = entry.startTime;
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as Array<
        PerformanceEntry & { hadRecentInput?: boolean; value?: number }
      >) {
        if (!entry.hadRecentInput) vitals.cls += entry.value ?? 0;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });

  await page.goto('/');
  await page.waitForTimeout(1_000);
  const vitals = await page.evaluate(
    () =>
      (window as typeof window & { __publicAlphaVitals: { cls: number; lcp: number } })
        .__publicAlphaVitals
  );

  await testInfo.attach('web-vitals.json', {
    body: JSON.stringify(vitals, null, 2),
    contentType: 'application/json',
  });
  console.info(`Local Web Vitals: LCP=${vitals.lcp.toFixed(1)}ms CLS=${vitals.cls.toFixed(4)}`);
  expect(vitals.lcp).toBeGreaterThan(0);
  expect(vitals.lcp).toBeLessThanOrEqual(2_500);
  expect(vitals.cls).toBeLessThanOrEqual(0.1);
});
