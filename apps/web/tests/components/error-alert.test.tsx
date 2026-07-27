// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ErrorAlert } from '../../src/components/ErrorAlert';

describe('ErrorAlert', () => {
  it('shows retry affordance and offline guidance for network errors', async () => {
    const onRetry = vi.fn();

    render(<ErrorAlert message="Failed to fetch" onRetry={onRetry} retryLabel="Retry import" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Offline? Check your connection');
    fireEvent.click(screen.getByRole('button', { name: 'Retry import' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
