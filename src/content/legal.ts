import { PRODUCT_NAME } from './brand';

export const privacySections = [
  {
    title: 'Data minimization',
    items: [
      'You don’t need an account. You sign in to your own Apple Music account through MusicKit, and Showtape never stores your Apple credentials.',
      'Showtape shows public setlist.fm data and uses it to build your playlist. Successful upstream responses may sit in server memory for up to one hour; the app never writes them to disk.',
      'This alpha has no analytics, no advertising, and no Showtape user-account database.',
    ],
  },
  {
    title: 'Where data lives',
    items: [
      'Apple handles MusicKit sign-in, catalog search, and playlist creation under Apple’s own privacy terms.',
      'Setlist content comes from setlist.fm under its terms and privacy policy.',
      'Your host may log request metadata such as IP address and path. What gets logged, and for how long, depends on the deployment; the app does not log credential values on purpose.',
      'Your browser keeps up to eight recent setlist URLs or IDs and their parsed IDs in localStorage. Migrated legacy history drops the upstream artist, venue, date, and song data. An interrupted export may keep the playlist ID, the exact remaining song IDs (or an unknown-progress marker), and a selection signature in sessionStorage for up to 30 minutes. It resumes automatically only when the remaining IDs are known.',
      'The native iPhone, iPad, and Mac apps keep up to eight recent successful inputs and one export recovery record in app-private UserDefaults. That record expires after 30 minutes and holds the playlist name and identity, the ordered selected song IDs, the duplicate policy, the selection signature, confirmed progress, and an in-flight or unknown-outcome marker. It never syncs across devices. Native MusicKit manages authorization, and Showtape does not persist MusicKit user tokens itself.',
    ],
  },
  {
    title: 'Network-only public alpha',
    items: [
      'There is no service worker, no offline access, and no background sync. Import, matching, authorization, and playlist creation all need a network connection.',
    ],
  },
] as const;

export const termsItems = [
  'Follow Apple’s and setlist.fm’s terms and policies.',
  'Use setlist.fm API access only for an allowed purpose, and keep the source attribution links the app shows.',
  'Avoid excessive API use or automated abuse.',
  'Accept that this public alpha depends on network access and third-party services, so imports, matching, authorization, and playlist creation may be unavailable or may fail.',
  'Accept that the tool comes as is, without warranty, and that the maintainers are not liable for data loss or service interruption beyond what applicable law allows.',
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
