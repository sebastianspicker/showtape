// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import DemoPage from '../../src/app/demo/page';

describe('DemoPage', () => {
  it('renders the documented static screenshot flow without API calls', () => {
    render(<DemoPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Setlist to Playlist Demo' })
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Demo setlist URL' })).toHaveValue(
      'https://www.setlist.fm/setlist/the-beatles/1964/hollywood-bowl-hollywood-ca-63de4613.html'
    );
    expect(screen.getByRole('heading', { level: 2, name: '1. Import' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: '2. Preview' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: '3. Matching' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: '4. Export' })).toBeInTheDocument();
    expect(screen.getByText('Playlist created.')).toBeInTheDocument();
  });
});
