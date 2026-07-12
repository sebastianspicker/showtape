export const privacySections = [
  {
    title: 'Data minimization',
    items: [
      'We do not require an account. You use your own Apple Music account through MusicKit, and we do not store your Apple credentials.',
      'Public setlist.fm data is used only to show the setlist and create your playlist. Successful upstream responses may be cached in server memory for up to one hour and are not persisted to disk by the application.',
      'We do not sell or share your data for advertising.',
    ],
  },
  {
    title: 'Where data lives',
    items: [
      'Apple handles MusicKit authentication, catalog search, and playlist creation under Apple’s privacy terms.',
      'Setlist content comes from setlist.fm under its terms and privacy policy.',
      'Application servers may log minimal request data such as IP address and path for operation and security. They do not store Apple or setlist.fm credentials.',
      'Your browser stores up to eight recent imports in localStorage with input, setlistId, artist, venue, and date. Valid v1 input-only history is migrated locally and enriched after re-import. Interrupted exports may store the playlist ID, remaining song IDs, and a selection signature in sessionStorage for up to 30 minutes so an exact resume is safe.',
    ],
  },
  {
    title: 'Network-only public alpha',
    items: [
      'There is no service worker, offline access, or background sync. Import, matching, authorization, and playlist creation require network access.',
    ],
  },
] as const;

export const termsItems = [
  'Use the application in accordance with Apple’s and setlist.fm’s terms and policies.',
  'Refrain from excessive API use or automated abuse.',
  'Understand that this public-alpha service depends on network access and third-party services, so imports, matching, authorization, and playlist creation may be unavailable or fail.',
  'Understand that the tool is provided as is without warranty, and the maintainers are not liable for loss of data or service interruption beyond what applicable law permits.',
] as const;

export function renderPrivacyMarkdown(): string {
  const sections = privacySections
    .map(
      (section) => `## ${section.title}\n\n${section.items.map((item) => `- ${item}`).join('\n')}`
    )
    .join('\n\n');
  return `# Privacy\n\n${sections}\n\nFor formal terms, see TERMS.md.\n`;
}

export function renderTermsMarkdown(): string {
  return `# Terms of Use\n\nBy using this application you agree to:\n\n${termsItems
    .map((item) => `- ${item}`)
    .join('\n')}\n`;
}
