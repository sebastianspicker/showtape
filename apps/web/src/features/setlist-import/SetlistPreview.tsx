import { memo } from 'react';
import { flattenSetlistToEntries, type Setlist } from '@repo/core';
import { SetlistAttribution } from '@/components/SetlistAttribution';

interface SetlistPreviewProps {
  setlist: Setlist;
}

export const SetlistPreview = memo(function SetlistPreview({ setlist }: SetlistPreviewProps) {
  const tracks = flattenSetlistToEntries(setlist).map((e) => ({ name: e.name, info: e.info }));

  return (
    <section aria-label="Setlist preview" className="setlist-preview">
      <header className="setlist-preview__header">
        <h3 className="setlist-preview__artist">{setlist.artist}</h3>
        <div className="preview-meta">
          {setlist.venue ? (
            <span className="preview-meta-item">
              <span className="preview-meta-label">Venue</span>
              <strong>{setlist.venue}</strong>
            </span>
          ) : null}
          {setlist.eventDate ? (
            <span className="preview-meta-item">
              <span className="preview-meta-label">Date</span>
              <strong>{setlist.eventDate}</strong>
            </span>
          ) : null}
          <span className="preview-meta-item">
            <span className="preview-meta-label">Songs</span>
            <strong>{tracks.length}</strong>
          </span>
        </div>
      </header>
      <SetlistAttribution sourceUrl={setlist.sourceUrl} />
      {tracks.length === 0 ? (
        <p className="empty-state">This setlist has no songs listed. Try a different setlist.</p>
      ) : (
        <ol className="preview-track-list">
          {tracks.map((t, i) => (
            <li key={`${t.name}-${t.info ?? ''}-${i}`} className="preview-track-item">
              <span className="preview-track-name">{t.name}</span>
              {t.info ? <span className="muted-inline"> - {t.info}</span> : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
});
