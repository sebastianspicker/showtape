import { privacySections } from '@/content/legal';

export default function PrivacyPage() {
  return (
    <main id="main" className="main-content prose-page" tabIndex={-1}>
      <h1>Privacy</h1>
      {privacySections.map((section) => (
        <section key={section.title}>
          <h2>{section.title}</h2>
          <ul>
            {section.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
