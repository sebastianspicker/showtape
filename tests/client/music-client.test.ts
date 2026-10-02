// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MusicKitGlobal, MusicKitInstance } from '@/client/music/types';

const tokenMocks = vi.hoisted(() => ({
  fetchDeveloperToken: vi.fn(),
  isTokenValid: vi.fn(),
}));

vi.mock('@/client/music/token', () => tokenMocks);

function createMusicKit(): { global: MusicKitGlobal; instance: MusicKitInstance } {
  const instance: MusicKitInstance = {
    authorize: vi.fn(async () => 'user-token'),
    unauthorize: vi.fn(async () => undefined),
    isAuthorized: false,
    storefrontId: 'us',
    music: { api: vi.fn(async () => ({})) },
  };
  return {
    instance,
    global: {
      configure: vi.fn(async () => instance),
      getInstance: vi.fn(() => instance),
    },
  };
}

async function flushScriptCreation(): Promise<HTMLScriptElement> {
  await vi.advanceTimersByTimeAsync(0);
  const script = document.querySelector<HTMLScriptElement>('script[data-musickit]');
  expect(script).not.toBeNull();
  return script!;
}

describe('MusicKit client initialization', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_APPLE_MUSIC_APP_ID', 'app.test.showtape');
    tokenMocks.fetchDeveloperToken.mockReset().mockResolvedValue('developer-token');
    tokenMocks.isTokenValid.mockReset().mockReturnValue(true);
    document.head.innerHTML = '';
    delete window.MusicKit;
  });

  afterEach(() => {
    document.head.innerHTML = '';
    delete window.MusicKit;
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('deduplicates concurrent script loading and MusicKit configuration', async () => {
    const { global, instance } = createMusicKit();
    const { initMusicKit } = await import('@/client/music/client');

    const firstInitialization = initMusicKit();
    const secondInitialization = initMusicKit();
    const script = await flushScriptCreation();

    window.MusicKit = global;
    script.dispatchEvent(new Event('load'));

    await expect(Promise.all([firstInitialization, secondInitialization])).resolves.toEqual([
      instance,
      instance,
    ]);
    expect(tokenMocks.fetchDeveloperToken).toHaveBeenCalledTimes(1);
    expect(global.configure).toHaveBeenCalledTimes(1);
    expect(global.getInstance).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll('script[data-musickit]')).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('uses one ten-second deadline for download and global availability', async () => {
    const { initMusicKit } = await import('@/client/music/client');
    const initialization = initMusicKit();
    const failure = initialization.catch((error: unknown) => error);
    const script = await flushScriptCreation();

    await vi.advanceTimersByTimeAsync(9_900);
    script.dispatchEvent(new Event('load'));
    await vi.advanceTimersByTimeAsync(100);

    expect(await failure).toEqual(new Error('MusicKit script did not load'));
    expect(document.querySelector('script[data-musickit]')).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cleans a timed-out attempt before retrying successfully', async () => {
    const { global, instance } = createMusicKit();
    const { initMusicKit } = await import('@/client/music/client');
    const failedInitialization = initMusicKit();
    const failure = failedInitialization.catch((error: unknown) => error);
    const failedScript = await flushScriptCreation();
    const removeListener = vi.spyOn(failedScript, 'removeEventListener');

    await vi.advanceTimersByTimeAsync(10_000);
    expect(await failure).toEqual(new Error('MusicKit script did not load'));
    expect(failedScript.isConnected).toBe(false);
    expect(removeListener).toHaveBeenCalledWith('load', expect.any(Function));
    expect(removeListener).toHaveBeenCalledWith('error', expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);

    const retry = initMusicKit();
    const retryScript = await flushScriptCreation();
    expect(retryScript).not.toBe(failedScript);
    window.MusicKit = global;
    retryScript.dispatchEvent(new Event('load'));

    await expect(retry).resolves.toBe(instance);
    expect(tokenMocks.fetchDeveloperToken).toHaveBeenCalledTimes(2);
    expect(global.configure).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
