import { expect, test } from '@playwright/test';
import { installBrowserFakes, musicKitCalls } from './helpers';

const titles = [
  'Burn the Witch',
  'Daydreaming',
  'Decks Dark',
  'Desert Island Disk',
  'Ful Stop',
  'Street Spirit (Fade Out)',
];

// Illustrative concert data matches the approved design, not a live provider response.
const concert = {
  id: '63de4613',
  artist: 'Radiohead',
  venue: 'Roundhouse',
  eventDate: '26-05-2016',
  sourceUrl: 'https://www.setlist.fm/setlist/sample/2016/sample-63de4613.html',
  sets: [titles.map((name) => ({ name, artist: 'Radiohead' }))],
};

for (const width of [1440, 375, 320]) {
  test(`backstage workflow preserves recording decisions and fits ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 812 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    const { externalRequests } = await installBrowserFakes(page);
    await page.route('**/api/setlist/proxy**', (route) => route.fulfill({ json: concert }));
    await page.goto('/');
    await expect(page).toHaveTitle('Showtape');
    await expect(page.getByRole('heading', { name: 'Keep the set.' })).toBeVisible();
    await page.evaluate(async (songs) => {
      await document.fonts.ready;
      const instance = window.MusicKit!.getInstance();
      const original = instance.music.api;
      instance.music.api = async (path, options) => {
        const response = await original(path, options);
        if (!path.startsWith('/v1/catalog/')) return response;
        const params = new URL(path, 'https://api.music.apple.com').searchParams;
        const term = params.get('term') ?? '';
        const manual = params.get('limit') === '8';
        const index = songs.findIndex((song) => term.includes(song));
        const name = manual ? songs[5] : songs[index];
        return {
          results: {
            songs: {
              data:
                !name || (!manual && index === 5)
                  ? []
                  : [
                      {
                        id: `recording-${manual ? 5 : index}`,
                        attributes: { name, artistName: 'Radiohead' },
                      },
                    ],
            },
          },
        };
      };
    }, titles);
    const screenshot = async (state: string) => {
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
        .toBe(true);
      await page.screenshot({
        path: `/tmp/showtape-backstage-qa/${testInfo.project.name}-${width}-${state}.png`,
        fullPage: true,
      });
    };
    await screenshot('import');
    await page.getByLabel('setlist.fm URL or ID').fill(concert.id);
    await page.getByRole('button', { name: 'Import setlist', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Review setlist', exact: true })).toBeFocused();
    await screenshot('preview');
    await page.getByRole('button', { name: 'Match songs on Apple Music' }).click();
    await expect(page.getByRole('heading', { name: 'Radiohead', exact: true })).toBeFocused();
    await expect(page.getByText('5 selected · 1 unresolved', { exact: true })).toBeVisible();
    if (width < 768) {
      const review = page.getByRole('button', { name: 'Review recording for Burn the Witch' });
      const firstChange = page.getByRole('button', { name: 'Change match for Burn the Witch' });
      await expect(firstChange).toBeHidden();
      await review.focus();
      await review.press('Enter');
      await expect(review).toHaveAttribute('aria-expanded', 'true');
      await expect(firstChange).toBeVisible();
      await firstChange.click();
      await review.click();
      await expect(firstChange).toBeHidden();
      await page.getByRole('searchbox', { name: 'Search Apple Music' }).press('Escape');
      await expect(review).toHaveAttribute('aria-expanded', 'true');
      await expect(firstChange).toBeFocused();
      await review.press('Enter');
      await expect(firstChange).toBeHidden();
    }
    const change = page.getByRole('button', {
      name: 'Change match for Street Spirit (Fade Out)',
      exact: true,
    });
    await change.click();
    const search = page.getByRole('searchbox', { name: 'Search Apple Music' });
    await expect(search).toBeFocused();
    await search.press('Escape');
    await expect(change).toBeFocused();
    await change.click();
    await search.fill('Street Spirit Radiohead');
    await search.press('Enter');
    const choice = page.getByRole('button', {
      name: 'Select Street Spirit (Fade Out) by Radiohead',
    });
    await expect(choice).toBeVisible();
    await screenshot('matching');
    await choice.click();
    await expect(change).toBeFocused();
    await page.getByRole('button', { name: 'Review playlist', exact: true }).click();
    await expect(page.getByRole('list', { name: 'Selected songs' }).locator('li')).toHaveCount(6);
    await expect(page.getByRole('checkbox')).not.toBeChecked();
    await screenshot('export');
    await page.getByRole('button', { name: 'Create playlist', exact: true }).click();
    await page
      .getByRole('button', { name: 'Connect Apple Music and create playlist', exact: true })
      .click();
    await expect(page.getByRole('heading', { name: 'Made you a mixtape.' })).toBeFocused();
    await expect(page.getByText('6 of 6 recordings added', { exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Made you a mixtape.' })).toMatchAriaSnapshot(`
      - paragraph: "Venue: Roundhouse"
    `);
    await screenshot('success');
    expect(await musicKitCalls(page)).toMatchObject({
      authorize: 1,
      create: 1,
      add: 1,
      addedTrackIds: [titles.map((_, index) => `recording-${index}`)],
    });
    expect(externalRequests).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('keeps an empty imported concert and an invalid input actionable', async ({ page }) => {
  await installBrowserFakes(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Import setlist', exact: true }).click();
  await expect(
    page.getByRole('region', { name: 'Import setlist' }).getByRole('alert')
  ).toContainText('Enter');
  await expect(page.getByLabel('setlist.fm URL or ID')).toBeFocused();
  await page.route('**/api/setlist/proxy**', (route) =>
    route.fulfill({ json: { ...concert, sets: [] } })
  );
  await page.getByLabel('setlist.fm URL or ID').fill(concert.id);
  await page.getByRole('button', { name: 'Import setlist', exact: true }).click();
  await expect(
    page.getByText('This setlist has no songs listed. Try a different setlist.')
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Match songs on Apple Music' })).toBeDisabled();
});

test('reflows long concert and recording names with enlarged text', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 812 });
  await installBrowserFakes(page);
  const artist = 'King Gizzard & the Lizard Wizard — live with special guests';
  const name = 'The River / Wah Wah / Road Train (extended concert arrangement)';
  await page.route('**/api/setlist/proxy**', (route) =>
    route.fulfill({
      json: {
        ...concert,
        artist,
        venue: 'A very long venue name with an outdoor amphitheatre',
        sets: [[{ name, artist, info: 'Encore with an extended instrumental introduction' }]],
      },
    })
  );
  await page.goto('/');
  await page.getByLabel('setlist.fm URL or ID').fill(concert.id);
  await page.getByRole('button', { name: 'Import setlist', exact: true }).click();
  await page.getByRole('button', { name: 'Match songs on Apple Music' }).click();
  await expect(page.getByText('1 selected · 0 unresolved', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: `Review recording for ${name}`, exact: true }).click();
  // Text enlargement complements the 320px reflow checks for a zoomed desktop viewport.
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  await expect(page.getByRole('button', { name: `Change match for ${name}` })).toBeVisible();
  const songBounds = await page.locator('.matching-track-meta strong').boundingBox();
  expect(songBounds?.width).toBeGreaterThan(150);
  await page.screenshot({
    path: `/tmp/showtape-backstage-qa/${testInfo.project.name}-320-enlarged-text.png`,
    fullPage: true,
  });
});
