import { PRODUCT_NAME } from '@/content/brand';
import { fetchDeveloperToken, isTokenValid } from './token';
import type { MusicKitGlobal, MusicKitInstance } from './types';

/** Apple Music app ID for MusicKit; Next inlines only this literal `process.env` expression. */
const APPLE_MUSIC_APP_ID = process.env.NEXT_PUBLIC_APPLE_MUSIC_APP_ID ?? '';

const MUSICKIT_SCRIPT_URL = 'https://js-cdn.music.apple.com/musickit/v3/musickit.js';
const MUSICKIT_LOAD_TIMEOUT_MS = 10_000;
const MUSICKIT_GLOBAL_POLL_MS = 50;

let scriptPromise: Promise<MusicKitGlobal> | null = null;

function removeMarkedMusicKitScripts(): void {
  document.querySelectorAll<HTMLScriptElement>('script[data-musickit]').forEach((script) => {
    script.remove();
  });
}

function loadMusicKitScript(): Promise<MusicKitGlobal> {
  if (typeof window === 'undefined')
    return Promise.reject(new Error('MusicKit only runs in the browser'));
  if (window.MusicKit) return Promise.resolve(window.MusicKit);
  if (scriptPromise) return scriptPromise;

  const pendingScript = new Promise<MusicKitGlobal>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-musickit]');
    const script = existing ?? document.createElement('script');
    let settled = false;

    const cleanup = () => {
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
      clearInterval(pollTimer);
      clearTimeout(deadlineTimer);
    };
    const finishWithMusicKit = () => {
      if (settled || !window.MusicKit) return;
      settled = true;
      cleanup();
      resolve(window.MusicKit);
    };
    const fail = () => {
      if (settled) return;
      settled = true;
      cleanup();
      removeMarkedMusicKitScripts();
      reject(new Error('MusicKit script did not load'));
    };

    const handleLoad = () => finishWithMusicKit();
    const handleError = () => fail();

    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });
    const pollTimer = setInterval(finishWithMusicKit, MUSICKIT_GLOBAL_POLL_MS);
    const deadlineTimer = setTimeout(fail, MUSICKIT_LOAD_TIMEOUT_MS);

    if (!existing) {
      script.src = MUSICKIT_SCRIPT_URL;
      script.crossOrigin = 'anonymous';
      script.dataset.musickit = 'true';
      document.head.append(script);
    }

    finishWithMusicKit();
  });

  scriptPromise = pendingScript;
  const clearCachedPromise = () => {
    if (scriptPromise === pendingScript) scriptPromise = null;
  };
  void pendingScript.then(clearCachedPromise, clearCachedPromise);
  return pendingScript;
}

let configuredInstance: MusicKitInstance | null = null;
let initPromise: Promise<MusicKitInstance> | null = null;

/**
 * Configure MusicKit with Developer Token and app ID.
 * Promise-based singleton to prevent concurrent init races.
 */
export async function initMusicKit(): Promise<MusicKitInstance> {
  if (configuredInstance) {
    if (!isTokenValid()) {
      configuredInstance = null;
      initPromise = null;
    } else {
      return configuredInstance;
    }
  }
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      if (!APPLE_MUSIC_APP_ID || APPLE_MUSIC_APP_ID.trim() === '') {
        throw new Error(
          'NEXT_PUBLIC_APPLE_MUSIC_APP_ID is required for MusicKit. Set it in your environment (see .env.example).'
        );
      }
      const token = await fetchDeveloperToken();
      const MusicKit = await loadMusicKitScript();
      const configureResult = MusicKit.configure({
        developerToken: token,
        app: { name: PRODUCT_NAME, build: '1' },
        appId: APPLE_MUSIC_APP_ID,
      });
      if (configureResult && typeof (configureResult as Promise<unknown>).then === 'function') {
        await (configureResult as Promise<MusicKitInstance>);
      }
      configuredInstance = MusicKit.getInstance();
      return configuredInstance;
    } catch (err) {
      initPromise = null;
      throw err;
    }
  })();

  return initPromise;
}

export async function authorizeMusicKit(): Promise<string> {
  const music = await initMusicKit();
  return music.authorize();
}

export async function isMusicKitAuthorized(): Promise<boolean> {
  try {
    const music = await initMusicKit();
    return music.isAuthorized === true;
  } catch (err) {
    console.warn(
      'MusicKit authorization check failed during initialization:',
      err instanceof Error ? err.message : 'Unknown error'
    );
    return false;
  }
}
