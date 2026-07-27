import type { RefObject } from 'react';

interface StepHeaderProps {
  step: number;
  title: string;
  /** Optional lede / supporting text below the title. */
  context?: string;
  /**
   * Override for the stage label above the title.
   * Defaults to "Step N of 4 · {Import|Preview|Match|Export}".
   */
  stageLabel?: string;
  headingRef?: RefObject<HTMLElement | null>;
}

const STEP_LABELS: Record<number, string> = {
  1: 'Import',
  2: 'Preview',
  3: 'Match',
  4: 'Export',
};

export function StepHeader({ step, title, context, stageLabel, headingRef }: StepHeaderProps) {
  const label = stageLabel ?? `Step ${step} of 4 · ${STEP_LABELS[step]}`;

  return (
    <header className="step-header">
      <p className="step-indicator stage-label">
        <span className="step-indicator__dot" aria-hidden="true" />
        {label}
      </p>
      <h2 ref={headingRef as RefObject<HTMLHeadingElement | null>} tabIndex={-1}>
        {title}
      </h2>
      {context ? <p className="step-context">{context}</p> : null}
    </header>
  );
}
