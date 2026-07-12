import type { Metadata } from 'next';
import Link from 'next/link';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'Setlist to Playlist',
  description:
    'Turn any concert setlist into an Apple Music playlist. Paste a setlist.fm link, preview the songs, and save the playlist to your library.',
  manifest: '/manifest.webmanifest',
  referrer: 'no-referrer-when-downgrade',
  openGraph: {
    title: 'Setlist to Playlist',
    description:
      'Turn any concert setlist into an Apple Music playlist. Paste a setlist.fm link, preview the songs, and save the playlist to your library.',
    type: 'website',
    siteName: 'Setlist to Playlist',
  },
  twitter: {
    card: 'summary',
    title: 'Setlist to Playlist',
    description:
      'Turn any concert setlist into an Apple Music playlist. Paste a setlist.fm link, preview the songs, and save the playlist to your library.',
  },
  appleWebApp: {
    capable: true,
    title: 'Setlist to Playlist',
    statusBarStyle: 'black-translucent',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#0B0E14" />
      </head>
      <body>
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        <header className="site-header">
          <Link href="/" className="product-link" aria-label="Setlist to Playlist home">
            Setlist to Playlist
          </Link>
        </header>
        <div className="site-content">{children}</div>
        <footer className="site-footer">
          <p>Public alpha · Network connection and Apple Music subscription required.</p>
          <nav aria-label="Legal">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </nav>
        </footer>
      </body>
    </html>
  );
}
