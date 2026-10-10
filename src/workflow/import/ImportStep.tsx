'use client';

import type { RefObject } from 'react';
import { CassetteArtwork } from '@/ui/CassetteArtwork';
import { ErrorAlert } from '@/ui/ErrorAlert';
import { StatusText } from '@/ui/StatusText';
import { StepHeader } from '@/workflow/journey';
import { ImportForm } from './ImportForm';
import { ImportHistoryList } from './ImportHistoryList';
import type { SetlistImport } from './useSetlistImport';

export interface ImportStepProps {
  importer: SetlistImport;
  headingRef: RefObject<HTMLElement | null>;
}

type ImportStatusProps = Pick<SetlistImport, 'loading' | 'displayedError' | 'retryable' | 'retry'>;

function ImportStatus({ loading, displayedError, retryable, retry }: ImportStatusProps) {
  return (
    <>
      {loading ? <StatusText>Loading setlist…</StatusText> : null}
      {displayedError ? (
        <div id="setlist-error">
          <ErrorAlert
            message={displayedError}
            onRetry={retryable ? retry : undefined}
            retryLabel="Retry load setlist"
          />
        </div>
      ) : null}
    </>
  );
}

export function ImportStep({ importer, headingRef }: ImportStepProps) {
  return (
    <section className="workflow-section import-section" aria-label="Import setlist">
      <CassetteArtwork className="import-artwork" />
      <StepHeader
        title="Import a setlist"
        context="Paste a setlist.fm link or ID. Showtape turns the show into an Apple Music playlist, in the order it was played."
        headingRef={headingRef}
      />
      <div className="import-form-panel">
        <ImportForm
          inputValue={importer.inputValue}
          setInputValue={importer.setInputValue}
          loading={importer.loading}
          displayedError={importer.displayedError}
          inputRef={importer.inputRef}
          onSubmit={importer.submit}
          onValidateInput={importer.validateInput}
          onCancelLoad={importer.cancel}
        />
        <ImportStatus
          loading={importer.loading}
          displayedError={importer.displayedError}
          retryable={importer.retryable}
          retry={importer.retry}
        />
        <p className="import-subscription-note">
          Creating the playlist needs an Apple Music subscription.
        </p>
      </div>

      <ImportHistoryList
        history={importer.history}
        onSelectHistoryItem={importer.selectHistoryItem}
        onClearHistory={importer.clearHistory}
      />
      <span className="sr-only" role="status" aria-live="polite">
        {importer.historyAnnouncement}
      </span>
    </section>
  );
}
