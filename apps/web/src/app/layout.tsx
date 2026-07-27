import type { Metadata } from 'next';
import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google';
import Link from 'next/link';
import { PRODUCT_DESCRIPTION, PRODUCT_NAME } from '@/content/brand';
import '../styles/globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
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
    <html lang="en" className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <meta name="theme-color" content="#0E1116" />
      </head>
      <body>
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        <header className="site-header">
          <Link href="/" className="product-link" aria-label={`${PRODUCT_NAME} home`}>
            <span>{PRODUCT_NAME}</span>
          </Link>
          <p className="product-descriptor" aria-hidden="true">
            Setlist <span>→</span> Apple Music
          </p>
          <p className="site-header__meta" aria-hidden="true">
            <span className="status-dot" />
            Public alpha
          </p>
        </header>
        <div className="site-content">{children}</div>
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
