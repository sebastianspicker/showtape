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
      <div className="import-hero">
        <StepHeader
          step="import"
          title="Keep the set."
          context="Turn a concert setlist into an Apple Music playlist."
          headingRef={headingRef}
        />
        <div className="import-artwork">
          <CassetteArtwork />
        </div>
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
            Apple Music subscription required to create a playlist.
          </p>
        </div>
      </div>

      <p className="import-handwritten-note">One concert. Your song order.</p>
      <details className="workflow-orientation-panel">
        <summary>How it works</summary>
        <ol className="workflow-orientation">
          <li>Import the concert setlist.</li>
          <li>Confirm the show and song order.</li>
          <li>Review the Apple Music matches.</li>
          <li>Create the playlist in your library.</li>
        </ol>
      </details>

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
