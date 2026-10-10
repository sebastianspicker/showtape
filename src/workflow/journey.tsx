import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { MatchRow } from '@/workflow/matching/model';

export type JourneyStepId = 'import' | 'preview' | 'matching' | 'export';

export interface JourneyStep {
  id: JourneyStepId;
  number: number;
  railLabel: string;
}

/** The four stages of the Showtape journey, in order, with their rail copy. */
export const JOURNEY_STEPS: readonly JourneyStep[] = [
  { id: 'import', number: 1, railLabel: 'Import' },
  { id: 'preview', number: 2, railLabel: 'Preview' },
  { id: 'matching', number: 3, railLabel: 'Match' },
  { id: 'export', number: 4, railLabel: 'Export' },
];

function journeyStep(id: JourneyStepId): JourneyStep {
  return JOURNEY_STEPS.find((step) => step.id === id) ?? (JOURNEY_STEPS[0] as JourneyStep);
}

export function JourneyRail({ current }: { current: JourneyStepId }) {
  const currentNumber = journeyStep(current).number;
  return (
    <nav className="workflow-rail" aria-label="Playlist creation progress">
      <ol>
        {JOURNEY_STEPS.map((step) => {
          const isCurrent = step.number === currentNumber;
          const isComplete = step.number < currentNumber;

          return (
            <li
              key={step.number}
              className={[
                'workflow-rail__step',
                isCurrent ? 'workflow-rail__step--current' : '',
                isComplete ? 'workflow-rail__step--complete' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <span className="workflow-rail__number">{String(step.number).padStart(2, '0')}</span>
              <span className="workflow-rail__label">{step.railLabel}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

interface StepHeaderProps {
  title: string;
  /** Optional lede below the title; a list renders as event details kept whole per item. */
  context?: string | readonly string[];
  /**
   * Set the title as the handwritten setlist heading (the artist name). The stage name is then
   * announced before it, since the visible heading no longer says which stage this is.
   */
  setlistTitle?: string;
  headingRef?: RefObject<HTMLElement | null>;
}

/** The rail already shows the stage, so the header carries only the title and its context. */
export function StepHeader({ title, context, setlistTitle, headingRef }: StepHeaderProps) {
  return (
    <header className={setlistTitle ? 'step-header step-header--setlist' : 'step-header'}>
      <h2 ref={headingRef as RefObject<HTMLHeadingElement | null>} tabIndex={-1}>
        {setlistTitle ? <span className="sr-only">{setlistTitle}: </span> : null}
        {title}
      </h2>
      {context?.length ? (
        <p className="step-context">
          {typeof context === 'string'
            ? context
            : context.map((part, index) => (
                <span key={`${index}-${part}`}>
                  <span className="step-context__part">{part}</span>
                  {index < context.length - 1 ? ' · ' : null}
                </span>
              ))}
        </p>
      ) : null}
    </header>
  );
}

export interface Journey {
  step: JourneyStepId;
  /** Attach to the heading of the current step for focus management. */
  headingRef: RefObject<HTMLElement | null>;
  /**
   * A copy of the current setlist's match rows, synced from the lazily loaded matching stage so
   * Back/forward navigation keeps the user's choices. Cleared whenever a setlist is (re)imported.
   */
  matchDraft: MatchRow[] | null;
  saveMatchDraft: (rows: MatchRow[]) => void;
  /** Preview a freshly imported setlist; earlier match choices never carry over. */
  previewImported: () => void;
  showPreview: () => void;
  showMatching: () => void;
  showExport: (rows: MatchRow[]) => void;
  /** Return to import and drop the kept match choices. */
  restart: () => void;
}

export function useJourney(): Journey {
  const [step, setStep] = useState<JourneyStepId>('import');
  const [matchDraft, setMatchDraft] = useState<MatchRow[] | null>(null);
  const headingRef = useRef<HTMLElement | null>(null);
  const isFirstRender = useRef(true);

  // Move focus after step changes so keyboard and screen-reader users reach the new content.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // Defer until React has rendered the next step.
    const id = requestAnimationFrame(() => {
      const el = headingRef.current;
      if (el) {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        el.focus({ preventScroll: true });
      }
    });
    return () => {
      cancelAnimationFrame(id);
    };
  }, [step]);

  const saveMatchDraft = useCallback((rows: MatchRow[]) => {
    setMatchDraft(rows);
  }, []);
  const previewImported = useCallback(() => {
    setMatchDraft(null);
    setStep('preview');
  }, []);
  const showPreview = useCallback(() => {
    setStep('preview');
  }, []);
  const showMatching = useCallback(() => {
    setStep('matching');
  }, []);
  const showExport = useCallback((rows: MatchRow[]) => {
    setMatchDraft(rows);
    setStep('export');
  }, []);
  const restart = useCallback(() => {
    setMatchDraft(null);
    setStep('import');
  }, []);

  return {
    step,
    headingRef,
    matchDraft,
    saveMatchDraft,
    previewImported,
    showPreview,
    showMatching,
    showExport,
    restart,
  };
}
