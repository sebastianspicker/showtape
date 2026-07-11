'use client';

import { useEffect, useState } from 'react';
import { getErrorMessage } from '@repo/shared';
import { Button } from '@repo/ui';
import { ErrorAlert } from '@/components/ErrorAlert';
import { authorizeMusicKit, initMusicKit, isMusicKitAuthorized } from '@/lib/musickit';

export interface ConnectAppleMusicProps {
  onAuthorized?: () => void;
  label?: string;
}

function friendlyAuthMessage(message: string): string {
  if (message.includes('cancel') || message.includes('denied')) {
    return 'You cancelled or denied access. Click below to try again.';
  }
  if (message.includes('revoked') || message.includes('unauthorized')) {
    return 'Apple Music access was revoked. Click below to connect again.';
  }
  return message;
}

type AuthorizationStatus = 'checking' | 'authorized' | 'unauthorized';

/**
 * "Connect Apple Music" flow: init MusicKit, authorize user, show errors and retry.
 */
export function ConnectAppleMusic({
  onAuthorized,
  label = 'Connect Apple Music',
}: ConnectAppleMusicProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthorizationStatus>('checking');

  useEffect(() => {
    let active = true;
    void isMusicKitAuthorized().then((isAuthorized) => {
      if (active) {
        setStatus(isAuthorized ? 'authorized' : 'unauthorized');
      }
    });
    return () => {
      active = false;
    };
  }, []);

  async function runAction(fn: () => Promise<void>) {
    setError(null);
    setLoading(true);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function handleAuthorize() {
    void runAction(async () => {
      try {
        await authorizeMusicKit();
        const isAuthorized = await isMusicKitAuthorized();
        if (!isAuthorized) {
          setStatus('unauthorized');
          throw new Error('Apple Music authorization was not confirmed. Click below to try again.');
        }
        setStatus('authorized');
        onAuthorized?.();
      } catch (err) {
        const message = getErrorMessage(err, 'Authorization failed.');
        throw new Error(friendlyAuthMessage(message));
      }
    });
  }

  function handleDisconnect() {
    void runAction(async () => {
      try {
        const music = await initMusicKit();
        await music.unauthorize();
        const isAuthorized = await isMusicKitAuthorized();
        if (isAuthorized) {
          setStatus('authorized');
          throw new Error('Apple Music is still connected. Try disconnecting again.');
        }
        setStatus('unauthorized');
      } catch (err) {
        throw new Error(getErrorMessage(err, 'Failed to disconnect.'));
      }
    });
  }

  const isAuthorized = status === 'authorized';
  const isChecking = status === 'checking';

  return (
    <div className="connect-apple-music" style={{ marginTop: '1rem' }}>
      {isChecking && (
        <span className="muted-caption" role="status">
          Checking Apple Music status…
        </span>
      )}

      {!isChecking && !isAuthorized && (
        <Button
          onClick={handleAuthorize}
          loading={loading}
          loadingChildren="Connecting…"
          aria-label={loading ? 'Connecting to Apple Music' : label}
          title="Sign in with Apple Music to create playlists in your library"
        >
          {label}
        </Button>
      )}

      {isAuthorized && (
        <div className="apple-music-connected">
          <span className="connected-badge" role="status">
            <span className="connected-dot" aria-hidden="true" />
            Connected to Apple Music
          </span>
          <Button
            onClick={handleDisconnect}
            disabled={loading}
            variant="secondary"
            aria-label="Disconnect Apple Music"
            style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            Disconnect
          </Button>
        </div>
      )}

      {error && (
        <ErrorAlert message={error} onRetry={handleAuthorize} retryLabel="Try connecting again" />
      )}
    </div>
  );
}
