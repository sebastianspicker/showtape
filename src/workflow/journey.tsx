import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { MatchRow } from '@/workflow/matching/model';

export type JourneyStepId = 'import' | 'preview' | 'matching' | 'export';

export interface JourneyStep {
  id: JourneyStepId;
  number: number;
  railLabel: string;
  stageLabel: string;
}

/** The four stages of the Showtape journey, in order, with their rail and stage copy. */
export const JOURNEY_STEPS: readonly JourneyStep[] = [
  { id: 'import', number: 1, railLabel: 'Import', stageLabel: '01 / Import' },
  { id: 'preview', number: 2, railLabel: 'Preview', stageLabel: 'Step 02 / 04 — Preview' },
  { id: 'matching', number: 3, railLabel: 'Match', stageLabel: '03 / Review recordings' },
  { id: 'export', number: 4, railLabel: 'Export', stageLabel: 'Step 04 / 04 — Export' },
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
  step: JourneyStepId;
  title: string;
  /** Optional lede / supporting text below the title. */
  context?: string;
  headingRef?: RefObject<HTMLElement | null>;
}

export function StepHeader({ step, title, context, headingRef }: StepHeaderProps) {
  return (
    <header className="step-header">
      <p className="step-indicator stage-label">
        <span className="step-indicator__dot" aria-hidden="true" />
        {journeyStep(step).stageLabel}
      </p>
      <h2 ref={headingRef as RefObject<HTMLHeadingElement | null>} tabIndex={-1}>
        {title}
      </h2>
      {context ? <p className="step-context">{context}</p> : null}
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
