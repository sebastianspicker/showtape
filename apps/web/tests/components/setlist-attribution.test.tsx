// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { SetlistAttribution } from '../../src/components/SetlistAttribution';

afterEach(cleanup);

describe('SetlistAttribution', () => {
  it('links to the attribution URL supplied by setlist.fm', () => {
    render(
      <SetlistAttribution sourceUrl="https://www.setlist.fm/setlist/artist/show-deadbeef.html" />
    );

    expect(screen.getByRole('link', { name: 'setlist.fm' })).toHaveAttribute(
      'href',
      'https://www.setlist.fm/setlist/artist/show-deadbeef.html'
    );
  });

  it('uses the setlist.fm homepage for an unsafe URL', () => {
    render(<SetlistAttribution sourceUrl="https://setlist.fm.evil.example/" />);

    expect(screen.getByRole('link', { name: 'setlist.fm' })).toHaveAttribute(
      'href',
      'https://www.setlist.fm/'
    );
  });
});
