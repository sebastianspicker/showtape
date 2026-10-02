import { expect, type Page } from '@playwright/test';

export const SETLIST_ID = '63de4613';
export const SETLIST = {
  id: SETLIST_ID,
  artist: 'The Test Tapes',
  venue: 'Fixture Hall',
  eventDate: '2026-09-10',
  sourceUrl: `https://www.setlist.fm/setlist/the-test-tapes/2026/fixture-hall-${SETLIST_ID}.html`,
  sets: [
    [
      { name: 'First Song', artist: 'The Test Tapes' },
      { name: 'Second Song', artist: 'The Test Tapes' },
      { name: 'Third Song', artist: 'The Test Tapes' },
    ],
  ],
};

type MutationBehavior = 'success' | 'api-error' | 'reject' | 'deferred';

interface MusicKitPlan {
  authorized?: boolean;
  create?: MutationBehavior;
  add?: MutationBehavior[];
}

export interface MusicKitCalls {
  authorize: number;
  create: number;
  add: number;
  catalog: number;
  addedTrackIds: string[][];
}

interface BrowserMusicKitState extends MusicKitCalls {
  authorized: boolean;
  createBehavior: MutationBehavior;
  addBehaviors: MutationBehavior[];
  releaseCreate?: () => void;
}

declare global {
  interface Window {
    __showtapeMusicKitTest?: BrowserMusicKitState;
  }
}

const playlistResponse = {
  data: [
    {
      id: 'playlist-fixture',
      attributes: { url: 'https://music.apple.com/library/playlist/playlist-fixture' },
    },
  ],
};

/** Installs same-origin API routes and a browser-resident MusicKit fake. */
export async function installBrowserFakes(page: Page, plan: MusicKitPlan = {}) {
  const externalRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:3100') externalRequests.push(request.url());
  });

  await page.route('**/api/**', async (route) => {
    await route.abort('blockedbyclient');
  });
  await page.route('**/api/setlist/proxy**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(SETLIST),
    });
  });
  await page.route('**/api/apple/dev-token', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: 'browser-developer-token' }),
    });
  });

  await page.addInitScript(
    ({ authorized, create, add, playlist }) => {
      const state: BrowserMusicKitState = {
        authorized,
        createBehavior: create,
        addBehaviors: [...add],
        authorize: 0,
        create: 0,
        add: 0,
        catalog: 0,
        addedTrackIds: [],
      };
      window.__showtapeMusicKitTest = state;

      const instance = {
        isAuthorized: state.authorized,
        storefrontId: 'us',
        authorize: async () => {
          state.authorize += 1;
          state.authorized = true;
          instance.isAuthorized = true;
          return 'browser-user-token';
        },
        unauthorize: async () => {
          state.authorized = false;
          instance.isAuthorized = false;
        },
        music: {
          api: async (path: string, options?: { method?: string; data?: unknown }) => {
            if (path.startsWith('/v1/catalog/')) {
              state.catalog += 1;
              const params = new URL(path, 'https://api.music.apple.com').searchParams;
              const term = params.get('term') ?? '';
              const manual = params.get('limit') === '8';
              const data = manual
                ? [
                    {
                      id: 'manual-first',
                      attributes: {
                        name: 'First Song (Chosen Version)',
                        artistName: 'The Test Tapes',
                      },
                    },
                  ]
                : term.includes('Second Song')
                  ? []
                  : [
                      {
                        id: term.includes('Third Song') ? 'auto-third' : 'auto-first',
                        attributes: {
                          name: term.includes('Third Song') ? 'Third Song' : 'First Song',
                          artistName: 'The Test Tapes',
                        },
                      },
                    ];
              return { results: { songs: { data } } };
            }

            if (path === '/v1/me/library/playlists') {
              state.create += 1;
              if (state.createBehavior === 'reject') throw new Error('unconfirmed create');
              if (state.createBehavior === 'api-error') {
                return { errors: [{ status: '400', detail: 'definite create failure' }] };
              }
              if (state.createBehavior === 'deferred') {
                return new Promise((resolve) => {
                  state.releaseCreate = () => resolve(playlist);
                });
              }
              return playlist;
            }

            if (path.includes('/v1/me/library/playlists/') && path.endsWith('/tracks')) {
              state.add += 1;
              const body = options?.data as { data?: Array<{ id?: string }> } | undefined;
              state.addedTrackIds.push(
                body?.data?.flatMap((track) => (track.id ? [track.id] : [])) ?? []
              );
              const behavior = state.addBehaviors.shift() ?? 'success';
              if (behavior === 'reject') throw new Error('unconfirmed add');
              if (behavior === 'api-error') {
                return { errors: [{ status: '400', detail: 'definite add failure' }] };
              }
              return undefined;
            }

            throw new Error(`Unexpected MusicKit API path: ${path}`);
          },
        },
      };

      window.MusicKit = {
        configure: () => instance,
        getInstance: () => instance,
      };
    },
    {
      authorized: plan.authorized ?? false,
      create: plan.create ?? 'success',
      add: plan.add ?? ['success'],
      playlist: playlistResponse,
    }
  );

  return { externalRequests };
}

export async function expectFocusedHeading(page: Page, name: string) {
  const heading = page.getByRole('heading', { name, exact: true });
  await expect(heading).toBeVisible();
  await expect(heading).toBeFocused();
  return heading;
}

export async function importFixtureSetlist(page: Page, input = SETLIST_ID) {
  await page.goto('/');
  await page.getByLabel('setlist.fm URL or ID').fill(input);
  await page.getByRole('button', { name: 'Import setlist' }).click();
  await expectFocusedHeading(page, 'Review setlist');
  await expect(page.getByRole('region', { name: 'Setlist preview' })).toContainText('Fixture Hall');
}

export async function reachSettledMatching(page: Page) {
  await page.getByRole('button', { name: 'Match songs on Apple Music' }).click();
  await expectFocusedHeading(page, SETLIST.artist);
  await expect(page.getByLabel('2 of 3 selected')).toBeVisible();
  await expect(page.getByText('2 selected · 1 unresolved', { exact: true })).toBeVisible();
}

export async function reachExportWithDefaultMatches(page: Page) {
  await importFixtureSetlist(page);
  await reachSettledMatching(page);
  await page.getByRole('button', { name: 'Skip Second Song' }).click();
  await page.getByRole('button', { name: 'Review playlist' }).click();
  await expectFocusedHeading(page, 'Save to Apple Music');
}

export async function musicKitCalls(page: Page): Promise<MusicKitCalls> {
  return page.evaluate(() => {
    const state = window.__showtapeMusicKitTest;
    if (!state) throw new Error('MusicKit fake was not installed');
    return {
      authorize: state.authorize,
      create: state.create,
      add: state.add,
      catalog: state.catalog,
      addedTrackIds: state.addedTrackIds,
    };
  });
}

export async function releaseDeferredCreate(page: Page) {
  await page.evaluate(() => {
    const release = window.__showtapeMusicKitTest?.releaseCreate;
    if (!release) throw new Error('No deferred playlist creation is pending');
    release();
  });
}
