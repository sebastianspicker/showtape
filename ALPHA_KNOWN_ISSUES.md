# Showtape alpha: known issues

Thanks for testing Showtape. This page lists what we already know is rough or
unfinished, what you can do about it, and how to tell us about anything else.

## Before you start

You run Showtape yourself, with your own setlist.fm API key, your own Apple
developer credentials and an Apple Music subscription. Follow the Quick start in
the README.

## Known issues

### The full Apple Music journey has not been confirmed live yet

The automated checks simulate Apple Music. A complete run with a real account
(sign-in, catalog search and creating the playlist) has not been confirmed
for this release, especially in Safari.

If matching or export fails right away, open the browser's developer console
and look for messages that mention "Content Security Policy" or "MusicKit".
Please include them in your report.

### A wrong setlist.fm key looks like an outage

If your setlist.fm API key is missing, mistyped or not yet active, importing
shows "setlist.fm is temporarily unavailable". The page cannot tell you more,
because it does not reveal server settings to visitors. The terminal running
Showtape names the actual problem.

**Workaround:** check that terminal, fix `SETLISTFM_API_KEY` in `.env`, and
restart Showtape.

### Matching problems can show technical details

If Showtape cannot reach Apple Music, or your Apple configuration is incomplete,
the matching step says that some songs could not be matched and adds a short
technical reason after "Details:". For example, it may say that a setting is
missing or that the MusicKit script did not load. That reason is the most useful
thing to include in a bug report.

### Building needs internet access

`build` downloads fonts from Google Fonts. On a machine without internet access,
or behind a strict firewall, the build fails.

**Workaround:** build on a connected machine, or allow `fonts.googleapis.com`
and `fonts.gstatic.com`.

### Errors in the page are not collected anywhere

Showtape has no crash reporting. If something goes wrong in the page, we only
know what you tell us.

### Not part of this alpha

These are deliberately not part of this alpha:

- importing more than one setlist at a time
- export to anything other than Apple Music
- offline use
- accounts or sync between devices

## How to report a bug

Open an issue in the GitHub repository with the **Bug report** template. Please
include:

- what you did, step by step, and what you expected
- your browser and its version, and your operating system
- the setlist.fm URL or ID you used, if it is public
- any red error text shown on the page, word for word
- messages from the browser's developer console (in most browsers, right-click
  the page, choose **Inspect**, then open **Console**)
- the lines the Showtape terminal printed around the time of the problem

Before you post, remove anything private: API keys, the contents of your `.env`
file, tokens, authorization headers, account identifiers and playlist links.

If you think you found a security problem, don't open a public issue. Follow
the instructions in `SECURITY.md` instead.
