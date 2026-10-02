import Link from 'next/link';
import { PRODUCT_NAME } from '@/content/brand';

export default function NotFound() {
  return (
    <main id="main" className="main-content prose-page" tabIndex={-1}>
      <h1>Page not found</h1>
      <p className="support-text">The page you’re looking for doesn’t exist or has been moved.</p>
      <Link href="/" className="button button--secondary">
        Back to {PRODUCT_NAME}
      </Link>
    </main>
  );
}
