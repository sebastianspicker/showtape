// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../src/Button';

describe('Button rendering and variants', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('shows loadingChildren and is disabled + aria-busy when loading', () => {
    render(
      <Button loading loadingChildren="Saving…">
        Save
      </Button>
    );
    const btn = screen.getByRole('button', { name: 'Saving…' });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
  });

  it('uses "Loading…" as default loadingChildren', () => {
    render(<Button loading>Submit</Button>);
    expect(screen.getByRole('button', { name: 'Loading…' })).toBeInTheDocument();
  });

  it('secondary variant applies the secondary class', () => {
    render(<Button variant="secondary">Cancel</Button>);
    const btn = screen.getByRole('button', { name: 'Cancel' });
    expect(btn.className).toContain('secondary');
  });

  it('primary variant does not apply the secondary class', () => {
    render(<Button variant="primary">Confirm</Button>);
    const btn = screen.getByRole('button', { name: 'Confirm' });
    expect(btn.className).not.toContain('secondary');
  });
});

describe('Button interaction and attributes', () => {
  it('explicit disabled prop disables the button', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button', { name: 'Disabled' })).toBeDisabled();
  });

  it('loading disables the button even when disabled is explicitly false', () => {
    render(
      <Button loading disabled={false}>
        Saving
      </Button>
    );
    expect(screen.getByRole('button', { name: 'Loading…' })).toBeDisabled();
  });

  it('merges caller classes with its variant classes', () => {
    render(<Button className="wide">Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toHaveClass('button--primary', 'wide');
  });

  it('fires onClick when not disabled or loading', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not fire onClick when disabled', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Go
      </Button>
    );
    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('sets type="submit" when specified', () => {
    render(<Button type="submit">Send</Button>);
    expect(screen.getByRole('button', { name: 'Send' })).toHaveAttribute('type', 'submit');
  });

  it('passes additional html attributes through', () => {
    render(<Button data-testid="my-btn">OK</Button>);
    expect(screen.getByTestId('my-btn')).toBeInTheDocument();
  });
});
