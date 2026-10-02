interface CassetteArtworkProps {
  artist?: string;
  venue?: string;
  eventDate?: string;
  className?: string;
}

/** Decorative artwork; event information remains available in the adjacent content. */
export function CassetteArtwork({
  artist,
  venue,
  eventDate,
  className = '',
}: CassetteArtworkProps) {
  return (
    <div className={`cassette-artwork ${className}`} aria-hidden="true">
      <span className="cassette-artwork__image" />
      <div className="cassette-label">
        <span className="cassette-label__artist">{artist || 'Your next mix'}</span>
        {venue ? <span className="cassette-label__venue">{venue}</span> : null}
        {eventDate ? <span className="cassette-label__date">{eventDate}</span> : null}
      </div>
    </div>
  );
}
