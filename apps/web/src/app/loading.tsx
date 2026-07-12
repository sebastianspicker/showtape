export default function Loading() {
  return (
    <main id="main" className="main-content" tabIndex={-1}>
      <p role="status" aria-live="polite" className="support-text">
        Loading…
      </p>
    </main>
  );
}
