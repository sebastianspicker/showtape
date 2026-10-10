import { Button } from '@/ui/Button';
import { StatusText } from '@/ui/StatusText';
import type { MatchRow } from './model';

export interface MatchingSummaryProps {
  matches: MatchRow[];
  matchedCount: number;
  settledCount: number;
  isSettled: boolean;
  canProceed: boolean;
  onProceed: () => void;
}

function MatchingProgress({
  matches,
  matchedCount,
  settledCount,
  isSettled,
}: Pick<MatchingSummaryProps, 'matches' | 'matchedCount' | 'settledCount' | 'isSettled'>) {
  if (!isSettled) {
    return (
      <>
        Searching Apple Music · {settledCount} of {matches.length} checked
      </>
    );
  }
  const unresolved = matches.filter((match) => match.status === 'unmatched').length;
  const skipped = matches.filter((match) => match.status === 'skipped').length;
  return (
    <>
      <strong>
        {matchedCount} of {matches.length} selected
      </strong>
      {unresolved ? ` · ${unresolved} ${unresolved === 1 ? 'needs' : 'need'} a choice` : ''}
      {skipped ? ` · ${skipped} skipped` : ''}
    </>
  );
}

/** Sticky footer for the ledger: live progress on the left, the one next action on the right. */
export function MatchingSummary(props: MatchingSummaryProps) {
  const { isSettled, canProceed } = props;
  return (
    <aside className="matching-summary-panel" aria-label="Matching summary">
      <StatusText className="matching-progress">
        <MatchingProgress {...props} />
      </StatusText>
      <div className="matching-proceed">
        {!canProceed && isSettled ? (
          <p className="support-text matching-help">Match at least one song to continue.</p>
        ) : null}
        <Button
          onClick={props.onProceed}
          disabled={!canProceed}
          title="Review the selected songs before creating the Apple Music playlist"
          className="proceed-button"
        >
          Review playlist
        </Button>
      </div>
    </aside>
  );
}
