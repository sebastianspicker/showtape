import { expect, type Page, type TestInfo } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

export const SAMPLE_SETLIST = {
  id: '63de4613',
  versionId: 'fixture-version',
  eventDate: '23-08-1964',
  url: 'https://www.setlist.fm/setlist/the-beatles/1964/hollywood-bowl-hollywood-ca-63de4613.html',
  artist: { name: 'The Beatles' },
  venue: { name: 'Hollywood Bowl', city: { name: 'Hollywood' } },
  set: [
    {
      song: [
        { name: "Can't Buy Me Love" },
        { name: "A Hard Day's Night" },
        { name: 'Things We Said Today' },
      ],
    },
  ],
};

export const LONG_SETLIST = {
  ...SAMPLE_SETLIST,
  artist: { name: 'AReallyLongUnbrokenArtistNameForReflowTesting' },
  venue: {
    name: 'The Extremely Long International Amphitheatre and Cultural Performance Pavilion',
    city: { name: 'A City With A Long Name' },
  },
  set: [
    {
      song: [
        {
          name: 'An Exceptionally Long Live Song Title With Several Movements and an UnbrokenSuffixForTesting',
        },
        { name: 'A Second Song With Parenthetical Information (Extended Anniversary Version)' },
      ],
    },
  ],
};

type MusicKitScenario = 'success' | 'partial';

export async function installExternalMocks(
  page: Page,
  {
    scenario = 'success',
    catalogDelayMs = 0,
    setlist = SAMPLE_SETLIST,
  }: { scenario?: MusicKitScenario; catalogDelayMs?: number; setlist?: unknown } = {}
) {
  await page.route('https://js-cdn.music.apple.com/**', (route) => route.fulfill({ body: '' }));
  await page.route('**/api/apple/dev-token', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify({ token: 'e2e-token' }) })
  );
  await page.route('**/api/setlist/proxy**', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(setlist) })
  );
  await page.addInitScript(
    ({ mode, delayMs }) => {
      const tracks = [
        { id: 'song-1', attributes: { name: "Can't Buy Me Love", artistName: 'The Beatles' } },
        { id: 'song-2', attributes: { name: "A Hard Day's Night", artistName: 'The Beatles' } },
        { id: 'song-3', attributes: { name: 'Things We Said Today', artistName: 'The Beatles' } },
      ];
      const searchCatalog = async (path: string) => {
        if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
        const matchingTrack = path.includes('Hard')
          ? tracks[1]
          : path.includes('Things')
            ? tracks[2]
            : tracks[0];
        return { results: { songs: { data: [matchingTrack] } } };
      };
      const createPlaylist = () => ({
        data: [
          {
            id: 'playlist-e2e',
            attributes: { url: 'https://music.apple.com/library/playlist/playlist-e2e' },
          },
        ],
      });
      const addTracks = () => {
        if (mode === 'partial') throw new Error('Mocked Apple Music add failure');
        return { data: [] };
      };
      const instance = {
        isAuthorized: true,
        storefrontId: 'us',
        authorize: async () => 'e2e-user-token',
        unauthorize: async () => {
          instance.isAuthorized = false;
        },
        music: {
          api: async (path: string, options?: { method?: string }) => {
            if (path.includes('/search?')) return searchCatalog(path);
            if (path === '/v1/me/library/playlists' && options?.method === 'POST') {
              return createPlaylist();
            }
            if (path.includes('/tracks') && options?.method === 'POST') return addTracks();
            return { data: [] };
          },
        },
      };
      window.MusicKit = {
        configure: () => instance,
        getInstance: () => instance,
      };
    },
    { mode: scenario, delayMs: catalogDelayMs }
  );
}

export async function assertNoSeriousAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const seriousOrCritical = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical'
  );
  expect(seriousOrCritical, JSON.stringify(seriousOrCritical, null, 2)).toEqual([]);
}

export async function captureState(page: Page, testInfo: TestInfo, name: string) {
  const screenshotDir = path.resolve(process.cwd(), '../../docs/screenshots/workflow');
  await mkdir(screenshotDir, { recursive: true });
  const screenshotPath = path.join(screenshotDir, `${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await testInfo.attach(name, { path: screenshotPath, contentType: 'image/png' });
}

export async function assertNoHorizontalOverflow(page: Page) {
  await expect
    .poll(() =>
      page.locator('html').evaluate((element) => element.scrollWidth <= element.clientWidth)
    )
    .toBe(true);
}
