// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { Button } from '@repo/ui';
import { ErrorAlert } from '../../src/components/ErrorAlert';

describe('shared component harness', () => {
  it('renders app loading buttons with disabled and busy semantics', () => {
    render(
      <Button loading loadingChildren="Saving playlist...">
        Save playlist
      </Button>
    );

    const button = screen.getByRole('button', { name: 'Saving playlist...' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('shows retry affordance and offline guidance for network errors', async () => {
    const onRetry = vi.fn();

    render(<ErrorAlert message="Failed to fetch" onRetry={onRetry} retryLabel="Retry import" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Offline? Check your connection');
    fireEvent.click(screen.getByRole('button', { name: 'Retry import' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
