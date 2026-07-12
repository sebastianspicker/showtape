import { SetlistImportView } from '@/features/setlist-import/SetlistImportView';

export default function HomePage() {
  return (
    <main id="main" className="main-content" tabIndex={-1}>
      <h1 className="sr-only">Setlist to Playlist</h1>
      <SetlistImportView />
    </main>
  );
}
