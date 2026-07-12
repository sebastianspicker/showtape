import { termsItems } from '@/content/legal';

export default function TermsPage() {
  return (
    <main id="main" className="main-content prose-page" tabIndex={-1}>
      <h1>Terms of use</h1>
      <p>By using Setlist to Playlist, you agree to the following:</p>
      <ul>
        {termsItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </main>
  );
}
