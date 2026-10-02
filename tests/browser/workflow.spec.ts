import { expect, test } from '@playwright/test';
import {
  SETLIST_ID,
  expectFocusedHeading,
  importFixtureSetlist,
  installBrowserFakes,
  musicKitCalls,
  reachExportWithDefaultMatches,
  reachSettledMatching,
  releaseDeferredCreate,
} from './helpers';

test('imports, previews, manually adjusts matches, authorizes, and creates a playlist', async ({
  page,
}) => {
  const { externalRequests } = await installBrowserFakes(page);
  await importFixtureSetlist(page);
  await reachSettledMatching(page);

  await page.getByRole('button', { name: 'Change match for First Song' }).click();
  await page
    .getByRole('searchbox', { name: 'Search Apple Music' })
    .fill('First Song chosen version');
  await page.getByRole('button', { name: 'Search Apple Music' }).click();
  await page
    .getByRole('button', { name: 'Select First Song (Chosen Version) by The Test Tapes' })
    .click();
  await expect(page.getByText('First Song (Chosen Version)').first()).toBeVisible();

  await page.getByRole('button', { name: 'Skip Second Song' }).click();
  await expect(page.getByText('No match selected')).toBeVisible();
  await page.getByRole('button', { name: 'Review playlist' }).click();
  await expectFocusedHeading(page, 'Save to Apple Music');
  await expect(page.getByRole('list', { name: 'Selected songs' })).toContainText(
    'First Song (Chosen Version)'
  );

  await page.getByRole('button', { name: 'Create playlist' }).click();
  await page.getByRole('button', { name: 'Connect Apple Music and create playlist' }).click();
  await expect(page.getByRole('heading', { name: 'Made you a mixtape.' })).toBeVisible();
  await expect(page.getByText('2 of 2 recordings added')).toBeVisible();
  await expect(page.getByText('Setlist – The Test Tapes – 2026-09-10')).toBeVisible();
  await expect(page.locator('.success-artwork')).toContainText('Fixture Hall');
  expect(await musicKitCalls(page)).toMatchObject({ authorize: 1, create: 1, add: 1 });
  expect(externalRequests).toEqual([]);
});

test('restores exact partial progress and adds only the remaining track', async ({ page }) => {
  await installBrowserFakes(page, { authorized: true });
  await importFixtureSetlist(page);
  await reachSettledMatching(page);
  await page.getByRole('button', { name: 'Skip Second Song' }).click();
  await page.evaluate((setlistId) => {
    window.sessionStorage.setItem(
      `playlist_resume_v1:${setlistId}`,
      JSON.stringify({
        status: 'incomplete',
        progress: 'exact',
        id: 'playlist-fixture',
        url: 'https://music.apple.com/library/playlist/playlist-fixture',
        remainingIds: ['auto-third'],
        selectionSignature: JSON.stringify({
          dedupeTracks: false,
          songIds: ['auto-first', 'auto-third'],
        }),
        storedAt: Date.now(),
      })
    );
  }, SETLIST_ID);

  await page.getByRole('button', { name: 'Review playlist' }).click();
  await expectFocusedHeading(page, 'Save to Apple Music');
  await expect(
    page.getByRole('heading', { name: 'Playlist created; import incomplete' })
  ).toBeVisible();
  await expect(page.getByText('1 of 2 songs were added. 1 remain.')).toBeVisible();
  expect(await musicKitCalls(page)).toMatchObject({ create: 0, add: 0 });

  await page.getByRole('button', { name: 'Add remaining songs' }).click();
  await expect(page.getByRole('heading', { name: 'Made you a mixtape.' })).toBeVisible();
  expect(await musicKitCalls(page)).toMatchObject({
    create: 0,
    add: 1,
    addedTrackIds: [['auto-third']],
  });
  expect(
    await page.evaluate((id) => sessionStorage.getItem(`playlist_resume_v1:${id}`), SETLIST_ID)
  ).toBeNull();
});

test('does not automatically replay an unconfirmed track mutation', async ({ page }) => {
  await installBrowserFakes(page, { authorized: true, add: ['reject'] });
  await reachExportWithDefaultMatches(page);
  await page.getByRole('button', { name: 'Create playlist' }).click();

  await expect(
    page.getByRole('heading', { name: 'Playlist created; import incomplete' })
  ).toBeVisible();
  await expect(page.getByText('Automatic resume is unavailable')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add remaining songs' })).toHaveCount(0);
  await page.waitForTimeout(150);
  expect(await musicKitCalls(page)).toMatchObject({ create: 1, add: 1 });
});

test('suppresses duplicate playlist submissions while one mutation is pending', async ({
  page,
}) => {
  await installBrowserFakes(page, { authorized: true, create: 'deferred' });
  await reachExportWithDefaultMatches(page);

  await page.getByRole('button', { name: 'Create playlist' }).evaluate((button) => {
    (button as HTMLButtonElement).click();
    (button as HTMLButtonElement).click();
  });
  await expect.poll(async () => (await musicKitCalls(page)).create).toBe(1);
  await releaseDeferredCreate(page);
  await expect(page.getByRole('heading', { name: 'Made you a mixtape.' })).toBeVisible();
  expect(await musicKitCalls(page)).toMatchObject({ create: 1, add: 1 });
});

test('restores import history after a reload and reopens the saved setlist', async ({ page }) => {
  await installBrowserFakes(page);
  await importFixtureSetlist(
    page,
    `https://www.setlist.fm/setlist/test/fixture-${SETLIST_ID}.html`
  );
  await page.reload();

  const history = page.getByRole('region', { name: 'Recent imports' });
  await expect(history).toBeVisible();
  await history.getByRole('button', { name: new RegExp(`Setlist ${SETLIST_ID}`) }).click();
  await expectFocusedHeading(page, 'Review setlist');
  await expect(page.getByRole('region', { name: 'Setlist preview' })).toContainText(
    'The Test Tapes'
  );
});

test('shows upstream retry guidance and recovers when the user retries', async ({ page }) => {
  await installBrowserFakes(page);
  let requests = 0;
  await page.route('**/api/setlist/proxy**', async (route) => {
    if (requests++ === 0)
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        headers: { 'Retry-After': '17' },
        body: JSON.stringify({ code: 'RATE_LIMIT', error: 'setlist.fm is busy.' }),
      });
    else await route.fallback();
  });
  await page.goto('/');
  await page.getByRole('textbox', { name: 'setlist.fm URL or ID' }).fill(SETLIST_ID);
  await page.getByRole('button', { name: 'Import setlist' }).click();
  await expect(
    page.getByRole('region', { name: 'Import setlist' }).getByRole('alert')
  ).toContainText('Please wait 17 seconds before retrying.');
  await page.getByRole('button', { name: 'Retry load setlist' }).click();
  await expectFocusedHeading(page, 'Review setlist');
});
