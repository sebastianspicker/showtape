import type { Metadata } from 'next';
import { Permanent_Marker, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import Link from 'next/link';
import { PRODUCT_DESCRIPTION, PRODUCT_NAME } from '@/content/brand';
import '../styles/globals.css';
import '../styles/artwork.css';

const marker = Permanent_Marker({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-marker',
});

const sans = IBM_Plex_Sans({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const mono = IBM_Plex_Mono({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-typewriter',
});

export const metadata: Metadata = {
  title: PRODUCT_NAME,
  description: PRODUCT_DESCRIPTION,
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icons/showtape-mark.svg',
  },
  referrer: 'no-referrer-when-downgrade',
  openGraph: {
    title: PRODUCT_NAME,
    description: PRODUCT_DESCRIPTION,
    type: 'website',
    siteName: PRODUCT_NAME,
  },
  twitter: {
    card: 'summary',
    title: PRODUCT_NAME,
    description: PRODUCT_DESCRIPTION,
  },
  appleWebApp: {
    capable: true,
    title: PRODUCT_NAME,
    statusBarStyle: 'black-translucent',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${marker.variable} ${sans.variable} ${mono.variable}`}>
      <head>
        <meta name="theme-color" content="#232421" />
      </head>
      <body>
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        <div className="backstage-sheet">
          <header className="site-header">
            <Link href="/" className="product-link" aria-label={`${PRODUCT_NAME} home`}>
              <span>{PRODUCT_NAME}</span>
              <span className="product-descriptor">Setlist to Apple Music</span>
            </Link>
          </header>
          <div className="site-content">{children}</div>
        </div>
        <footer className="site-footer">
          <p>Public alpha · Network connection and Apple Music subscription required.</p>
          <nav aria-label="Project information">
            <a href="https://www.setlist.fm/" aria-label="setlist.fm source service">
              Setlist data: setlist.fm
            </a>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </nav>
        </footer>
      </body>
    </html>
  );
}
