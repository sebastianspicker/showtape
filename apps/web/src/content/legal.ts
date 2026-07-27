import { PRODUCT_NAME } from './brand';

export const privacySections = [
  {
    title: 'Data minimization',
    items: [
      'We do not require an account. You use your own Apple Music account through MusicKit, and we do not store your Apple credentials.',
      'Public setlist.fm data is displayed after retrieval and used to prepare the playlist. Successful upstream responses may be cached in server memory for up to one hour and are not persisted to disk by the application.',
      'The current alpha does not include analytics, advertising, or a Showtape user-account database.',
    ],
  },
  {
    title: 'Where data lives',
    items: [
      'Apple handles MusicKit authentication, catalog search, and playlist creation under Apple’s privacy terms.',
      'Setlist content comes from setlist.fm under its terms and privacy policy.',
      'Hosting infrastructure may log request metadata such as IP address and path. Logging and retention depend on the deployment; the application does not intentionally log credential values.',
      'Your browser stores up to eight recent user-entered setlist URLs or IDs and their parsed IDs in localStorage. Legacy history is migrated without retaining upstream artist, venue, date, or song data. Interrupted exports may store the playlist ID, exact remaining song IDs or an unknown-progress marker, and a selection signature in sessionStorage for up to 30 minutes. Automatic resume is available only when the remaining IDs are known.',
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
  'Operate setlist.fm API access only for an allowed purpose and preserve the source attribution links shown by the application.',
  'Refrain from excessive API use or automated abuse.',
  'Understand that this public alpha depends on network access and third-party services, so imports, matching, authorization, and playlist creation may be unavailable or fail.',
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
  return `# Terms of Use\n\nBy using ${PRODUCT_NAME}, you agree to:\n\n${termsItems
    .map((item) => `- ${item}`)
    .join('\n')}\n`;
}
