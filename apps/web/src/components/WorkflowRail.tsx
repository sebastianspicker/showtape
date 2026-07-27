const WORKFLOW_STEPS = [
  { number: 1, label: 'Import' },
  { number: 2, label: 'Preview' },
  { number: 3, label: 'Match' },
  { number: 4, label: 'Export' },
] as const;

interface WorkflowRailProps {
  currentStep: number;
}

export function WorkflowRail({ currentStep }: WorkflowRailProps) {
  return (
    <nav className="workflow-rail" aria-label="Playlist creation progress">
      <ol>
        {WORKFLOW_STEPS.map((step) => {
          const isCurrent = step.number === currentStep;
          const isComplete = step.number < currentStep;

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
              <span className="workflow-rail__label">{step.label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
