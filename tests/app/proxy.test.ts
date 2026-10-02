import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from '../../src/proxy';

describe('CSP boundary', () => {
  it('uses a per-response nonce and excludes unsafe inline scripts', () => {
    const response = proxy(new NextRequest('http://localhost:3000/'));
    const nonce = response.headers.get('x-nonce');
    const csp = response.headers.get('Content-Security-Policy') ?? '';
    const forwardedCsp = response.headers.get('x-middleware-request-content-security-policy');
    expect(nonce).toBeTruthy();
    expect(csp).toContain(`'nonce-${nonce}'`);
    expect(forwardedCsp).toBe(csp);
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
  });

  it('replaces untrusted inbound nonce and CSP headers', () => {
    const request = new NextRequest('http://localhost:3000/', {
      headers: {
        'content-security-policy': "script-src 'unsafe-inline'",
        'x-nonce': 'attacker-controlled',
      },
    });
    const response = proxy(request);
    const nonce = response.headers.get('x-nonce');
    const csp = response.headers.get('Content-Security-Policy');

    expect(nonce).toBeTruthy();
    expect(nonce).not.toBe('attacker-controlled');
    expect(csp).toContain(`'nonce-${nonce}'`);
    expect(csp).not.toContain("script-src 'unsafe-inline'");
    expect(response.headers.get('x-middleware-request-content-security-policy')).toBe(csp);
    expect(response.headers.get('x-middleware-request-x-nonce')).toBe(nonce);
  });

  it('limits browser connections to the same origin and Apple Music', () => {
    const csp =
      proxy(new NextRequest('http://localhost:3000/')).headers.get('Content-Security-Policy') ?? '';
    expect(csp).toContain("connect-src 'self' https://api.music.apple.com");
    expect(csp).not.toContain('localhost:4000');
  });
});
