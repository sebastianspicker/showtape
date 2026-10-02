export async function register() {
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_RUNTIME === 'nodejs') {
    const { initializeCsp } = await import('./server/security/csp');
    initializeCsp();
  }
}
