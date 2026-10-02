import { test, expect } from '@playwright/test';
import { SETLIST, installBrowserFakes, importFixtureSetlist } from './helpers';

for (const count of [20, 50, 100]) {
  test(`keeps ${count} matching rows responsive while five searches run`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await installBrowserFakes(page);
    await page.route('**/api/setlist/proxy**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...SETLIST,
          sets: [
            Array.from({ length: count }, (_, i) => ({
              name: `Song ${i + 1}`,
              artist: SETLIST.artist,
            })),
          ],
        }),
      })
    );
    await importFixtureSetlist(page);
    await page.evaluate(() => {
      const instance = window.MusicKit!.getInstance();
      const original = instance.music.api;
      let active = 0,
        peak = 0,
        calls = 0;
      instance.music.api = async (path, options) => {
        if (!path.includes('/search')) return original(path, options);
        active += 1;
        peak = Math.max(peak, active);
        calls += 1;
        await new Promise((done) => setTimeout(done, calls % 5 === 1 ? 100 : 20));
        try {
          return await original(path, options);
        } finally {
          active -= 1;
        }
      };
      Object.assign(window, { matchingMetrics: () => ({ peak, calls }) });
    });
    const started = Date.now();
    await page.getByRole('button', { name: 'Match songs on Apple Music' }).click();
    const review = page.getByRole('button', { name: 'Review recording for Song 1', exact: true });
    await expect(review).toBeVisible();
    await review.click();
    const skip = page.getByRole('button', { name: 'Skip Song 1', exact: true });
    await expect(skip).toBeVisible();
    const interactionStarted = Date.now();
    await skip.click();
    await expect(page.getByText('No match selected').first()).toBeVisible();
    const interactionMs = Date.now() - interactionStarted;
    await expect(
      page.getByText(`${count - 1} selected · 0 unresolved · 1 skipped`, { exact: true })
    ).toBeVisible();
    const completionMs = Date.now() - started;
    const metrics = await page.evaluate(() =>
      (
        window as unknown as { matchingMetrics: () => { peak: number; calls: number } }
      ).matchingMetrics()
    );
    expect(metrics.peak).toBeLessThanOrEqual(5);
    expect(metrics.calls).toBe(count);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    console.log(
      JSON.stringify({
        browser: testInfo.project.name,
        songs: count,
        completionMs,
        interactionMs,
        ...metrics,
      })
    );
    if (count === 20)
      await page.screenshot({
        path: `/tmp/showtape-matching-${testInfo.project.name}.png`,
        fullPage: false,
      });
  });
}
