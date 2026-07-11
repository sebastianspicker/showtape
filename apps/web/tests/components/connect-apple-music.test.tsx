// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockAuthorizeMusicKit = vi.fn();
const mockInitMusicKit = vi.fn();
const mockIsMusicKitAuthorized = vi.fn();

vi.mock('../../src/lib/musickit', () => ({
  authorizeMusicKit: (...args: unknown[]) => mockAuthorizeMusicKit(...args),
  initMusicKit: (...args: unknown[]) => mockInitMusicKit(...args),
  isMusicKitAuthorized: (...args: unknown[]) => mockIsMusicKitAuthorized(...args),
}));

import { ConnectAppleMusic } from '../../src/features/matching/ConnectAppleMusic';

describe('ConnectAppleMusic', () => {
  beforeEach(() => {
    mockAuthorizeMusicKit.mockReset();
    mockInitMusicKit.mockReset();
    mockIsMusicKitAuthorized.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows connected when MusicKit is already authorized', async () => {
    mockIsMusicKitAuthorized.mockResolvedValue(true);

    render(<ConnectAppleMusic />);

    expect(screen.getByRole('status')).toHaveTextContent('Checking Apple Music status');
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Connected to Apple Music');
    });
    expect(screen.queryByRole('button', { name: 'Connect Apple Music' })).not.toBeInTheDocument();
  });

  it('shows connect when MusicKit is not authorized', async () => {
    mockIsMusicKitAuthorized.mockResolvedValue(false);

    render(<ConnectAppleMusic />);

    expect(await screen.findByRole('button', { name: 'Connect Apple Music' })).toBeInTheDocument();
    expect(screen.queryByText('Connected to Apple Music')).not.toBeInTheDocument();
  });

  it('does not call onAuthorized when authorization is not confirmed', async () => {
    const onAuthorized = vi.fn();
    mockIsMusicKitAuthorized.mockResolvedValue(false);
    mockAuthorizeMusicKit.mockResolvedValue('user-token');

    render(<ConnectAppleMusic onAuthorized={onAuthorized} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Connect Apple Music' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('authorization was not confirmed');
    });
    expect(onAuthorized).not.toHaveBeenCalled();
    expect(screen.queryByText('Connected to Apple Music')).not.toBeInTheDocument();
  });

  it('calls onAuthorized only after authorization is checked', async () => {
    const onAuthorized = vi.fn();
    mockIsMusicKitAuthorized.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    mockAuthorizeMusicKit.mockResolvedValue('user-token');

    render(<ConnectAppleMusic onAuthorized={onAuthorized} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Connect Apple Music' }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Connected to Apple Music');
    });
    expect(onAuthorized).toHaveBeenCalledOnce();
  });

  it('shows a retryable message when authorization is cancelled or denied', async () => {
    mockIsMusicKitAuthorized.mockResolvedValue(false);
    mockAuthorizeMusicKit.mockRejectedValue(new Error('denied by user'));

    render(<ConnectAppleMusic />);

    fireEvent.click(await screen.findByRole('button', { name: 'Connect Apple Music' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'You cancelled or denied access. Click below to try again.'
      );
    });
    expect(screen.getByRole('button', { name: 'Try connecting again' })).toBeInTheDocument();
  });

  it('shows a revoked-access message for unauthorized MusicKit errors', async () => {
    mockIsMusicKitAuthorized.mockResolvedValue(false);
    mockAuthorizeMusicKit.mockRejectedValue(new Error('unauthorized token revoked'));

    render(<ConnectAppleMusic />);

    fireEvent.click(await screen.findByRole('button', { name: 'Connect Apple Music' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Apple Music access was revoked. Click below to connect again.'
      );
    });
  });

  it('checks MusicKit state after disconnect before showing connect again', async () => {
    const music = { unauthorize: vi.fn().mockResolvedValue(undefined) };
    mockInitMusicKit.mockResolvedValue(music);
    mockIsMusicKitAuthorized.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    render(<ConnectAppleMusic />);

    fireEvent.click(await screen.findByRole('button', { name: 'Disconnect Apple Music' }));

    await waitFor(() => {
      expect(music.unauthorize).toHaveBeenCalledOnce();
    });
    expect(await screen.findByRole('button', { name: 'Connect Apple Music' })).toBeInTheDocument();
  });
});
