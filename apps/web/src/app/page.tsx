import { SetlistImportView } from '@/features/setlist-import/SetlistImportView';
import { PRODUCT_NAME } from '@/content/brand';

export default function HomePage() {
  return (
    <main id="main" className="main-content" tabIndex={-1}>
      <h1 className="sr-only">{PRODUCT_NAME}</h1>
      <SetlistImportView />
    </main>
  );
}
