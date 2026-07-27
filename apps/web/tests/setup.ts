import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

/** next/font/google is not available under Vitest; return stub class variables. */
vi.mock('next/font/google', () => {
  const stub = () => ({ className: '', variable: '', style: { fontFamily: 'stub' } });
  return {
    Fraunces: stub,
    Inter: stub,
    JetBrains_Mono: stub,
  };
});
