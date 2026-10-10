import { memo } from 'react';
import { flattenSetlistToEntries, type Setlist } from '@/domain/setlist';
import { SetlistAttribution } from '@/ui/SetlistAttribution';

interface SetlistPreviewProps {
  setlist: Setlist;
}

export const SetlistPreview = memo(function SetlistPreview({ setlist }: SetlistPreviewProps) {
  const tracks = flattenSetlistToEntries(setlist).map((e) => ({
    name: e.name,
    info: e.info,
    artist: e.artist,
  }));

  return (
    <section aria-label="Setlist preview" className="setlist-preview">
      {tracks.length === 0 ? (
        <p className="empty-state">This setlist has no songs listed. Try a different setlist.</p>
      ) : (
        <ol className="preview-track-list">
          {tracks.map((t, i) => (
            <li key={`${t.name}-${t.info ?? ''}-${i}`} className="preview-track-item">
              <span className="preview-track-name">{t.name}</span>
              {t.artist && t.artist !== setlist.artist ? (
                <span className="preview-track-artist">{t.artist}</span>
              ) : null}
              {t.info ? <span className="preview-track-info">{t.info}</span> : null}
            </li>
          ))}
        </ol>
      )}
      <SetlistAttribution sourceUrl={setlist.sourceUrl} />
    </section>
  );
});
