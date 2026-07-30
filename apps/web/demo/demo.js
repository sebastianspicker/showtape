const states = [...document.querySelectorAll('[data-state]')];
const steps = [...document.querySelectorAll('[data-go]')].filter((element) =>
  element.classList.contains('step')
);

function showState(nextState) {
  states.forEach((state) => {
    state.hidden = state.dataset.state !== nextState;
  });
  steps.forEach((step) => {
    const current = step.dataset.go === nextState;
    step.classList.toggle('is-current', current);
    if (current) step.setAttribute('aria-current', 'step');
    else step.removeAttribute('aria-current');
  });
  document.querySelector(`[data-state="${nextState}"] h2`)?.focus({ preventScroll: true });
}

document.addEventListener('click', (event) => {
  const control = event.target.closest('[data-go]');
  if (control) showState(control.dataset.go);
});
