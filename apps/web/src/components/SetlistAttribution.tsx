import { getSetlistFmAttributionUrl } from '@repo/core';

interface SetlistAttributionProps {
  sourceUrl?: string;
  className?: string;
}

export function SetlistAttribution({ sourceUrl, className }: SetlistAttributionProps) {
  const attributionUrl = getSetlistFmAttributionUrl(sourceUrl);
  const classes = ['source-attribution', className].filter(Boolean).join(' ');

  return (
    <p className={classes}>
      Source:{' '}
      <a href={attributionUrl} target="_blank" rel="noopener">
        setlist.fm
      </a>
    </p>
  );
}
