import { describe, it, expect } from 'vitest';
import { handleHealth } from '../src/routes/health';

describe('handleHealth', () => {
  it('returns the public health response shape with an ISO timestamp', () => {
    const res = handleHealth();

    expect(res.status).toBe('ok');
    expect(typeof res.timestamp).toBe('string');
    expect(Number.isNaN(Date.parse(res.timestamp))).toBe(false);
    expect(Object.keys(res).sort()).toEqual(['status', 'timestamp']);
  });
});
