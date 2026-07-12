import type { RefObject } from 'react';

interface StepHeaderProps {
  step: number;
  title: string;
  context?: string;
  headingRef?: RefObject<HTMLElement | null>;
}

function StepHeaderAsHtml({ step, title, context, headingRef }: StepHeaderProps) {
  return (
    <header className="step-header">
      <p className="step-indicator">{`Step ${step} of 4`}</p>
      <h2 ref={headingRef as RefObject<HTMLHeadingElement | null>} tabIndex={-1}>
        {title}
      </h2>
      {context ? <p className="step-context">{context}</p> : null}
    </header>
  );
}

export { StepHeaderAsHtml as StepHeader };
