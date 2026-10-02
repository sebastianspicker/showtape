import { lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, '..');
const sourceDirectory = path.join(rootDirectory, 'demo');
const publishedOutputDirectory = path.join(rootDirectory, 'dist/pages');
const publishedDemoFiles = ['index.html', 'demo.css', 'demo.js'];
const screenshotDirectory = path.join(rootDirectory, 'docs', 'screenshots');
const screenshotFiles = [
  '01-import.png',
  '02-preview.png',
  '03-match.png',
  '04-export.png',
  '05-success.png',
  'responsive-390.png',
];
const requiredOutputFiles = [
  ...publishedDemoFiles,
  ...screenshotFiles,
  'globals.css',
  'showtape-mark.svg',
  '.nojekyll',
];
const csp =
  "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; connect-src 'none'; object-src 'none'; frame-src 'none'; media-src 'none'; worker-src 'none'; base-uri 'none'; form-action 'none'";
const argumentsAfterScript = process.argv.slice(2);
const check = argumentsAfterScript.length === 1 && argumentsAfterScript[0] === '--check';

if (argumentsAfterScript.length > 0 && !check) {
  throw new Error('Usage: node scripts/build-pages-demo.mjs [--check]');
}

function assertContains(text, name, value) {
  if (!text.includes(value)) throw new Error(`Demo check failed: missing ${name}.`);
}

function assertDoesNotMatch(text, name, expression) {
  if (expression.test(text)) throw new Error(`Demo check failed: ${name}.`);
}

function assertNoNavigatingForms(html) {
  const forms = html.match(/<form\b[^>]*>/gi) ?? [];
  if (forms.length !== 1 || !/\bid\s*=\s*["']import-form["']/i.test(forms[0])) {
    throw new Error('Demo check failed: only the local import form is allowed.');
  }
  if (/\b(?:action|method|formaction)\s*=/i.test(html)) {
    throw new Error('Demo check failed: forms must not navigate or submit to an endpoint.');
  }
}

function assertLocalUrls(html) {
  const allowedUrls = new Map([
    ['a:href', new Set(['./', '#demo-main'])],
    ['link:href', new Set(['./showtape-mark.svg', './globals.css', './demo.css'])],
    ['script:src', new Set(['./demo.js'])],
    ['img:src', new Set(screenshotFiles.map((file) => `./${file}`))],
  ]);
  const tags = html.matchAll(/<([a-z][\w:-]*)\b([^>]*)>/gi);
  for (const [, tagName, attributes] of tags) {
    for (const [, attributeName, , quotedValue, bareValue] of attributes.matchAll(
      /\b(href|src|action|formaction|poster|data)\s*=\s*(?:(["'])(.*?)\2|([^\s"'=<>`]+))/gi
    )) {
      const value = quotedValue ?? bareValue;
      const key = `${tagName.toLowerCase()}:${attributeName.toLowerCase()}`;
      if (!allowedUrls.get(key)?.has(value)) {
        throw new Error(`Demo check failed: unexpected URL-bearing attribute ${key}=${value}.`);
      }
    }
  }
}

function assertSafeHtml(html) {
  assertContains(html, 'GitHub Pages CSP', csp);
  assertDoesNotMatch(html, 'base elements are not allowed', /<base\b/i);
  assertDoesNotMatch(
    html,
    'meta refresh is not allowed',
    /<meta\b[^>]*http-equiv\s*=\s*["']refresh["']/i
  );
  assertDoesNotMatch(
    html,
    'active embedded media is not allowed',
    /<\/?(?:embed|frame|iframe|object|audio|video|track|source)\b/i
  );
  assertDoesNotMatch(html, 'inline event handlers are not allowed', /\son[a-z0-9:-]+\s*=/i);
  assertNoNavigatingForms(html);
  assertLocalUrls(html);
}

function assertSafeStyles(styles, name) {
  assertDoesNotMatch(styles, `${name} must not import remote styles`, /@import\b|url\s*\(/i);
}

function assertSafeSvg(svg) {
  assertDoesNotMatch(svg, 'SVG scripts are not allowed', /<\/?script\b/i);
  assertDoesNotMatch(svg, 'SVG foreignObject is not allowed', /<\/?foreignobject\b/i);
  assertDoesNotMatch(svg, 'SVG event handlers are not allowed', /\son[a-z0-9:-]+\s*=/i);
  assertDoesNotMatch(svg, 'SVG links are not allowed', /\b(?:xlink:)?href\s*=/i);
}

async function buildArtifact(directory) {
  await Promise.all(
    publishedDemoFiles.map(async (file) =>
      writeFile(path.join(directory, file), await readFile(path.join(sourceDirectory, file)))
    )
  );
  await writeFile(
    path.join(directory, 'globals.css'),
    await readFile(path.join(rootDirectory, 'src/styles/globals.css'))
  );
  await writeFile(
    path.join(directory, 'showtape-mark.svg'),
    await readFile(path.join(rootDirectory, 'public/icons/showtape-mark.svg'))
  );
  await Promise.all(
    screenshotFiles.map(async (file) =>
      writeFile(path.join(directory, file), await readFile(path.join(screenshotDirectory, file)))
    )
  );
  await writeFile(path.join(directory, '.nojekyll'), '');
}

async function validateArtifact(directory) {
  const entries = await readdir(directory);
  const unexpectedEntries = entries.filter((entry) => !requiredOutputFiles.includes(entry));
  const missingEntries = requiredOutputFiles.filter((entry) => !entries.includes(entry));
  if (unexpectedEntries.length || missingEntries.length) {
    throw new Error(
      `Demo check failed: artifact must contain exactly the allowlisted files. Missing: ${missingEntries.join(', ') || 'none'}; unexpected: ${unexpectedEntries.join(', ') || 'none'}.`
    );
  }
  await Promise.all(
    requiredOutputFiles.map(async (file) => {
      const status = await lstat(path.join(directory, file));
      if (!status.isFile()) throw new Error(`Demo check failed: ${file} must be a regular file.`);
    })
  );

  const [html, script, demoStyles, copiedGlobals, sourceGlobals, svg] = await Promise.all([
    readFile(path.join(directory, 'index.html'), 'utf8'),
    readFile(path.join(directory, 'demo.js'), 'utf8'),
    readFile(path.join(directory, 'demo.css'), 'utf8'),
    readFile(path.join(directory, 'globals.css'), 'utf8'),
    readFile(path.join(rootDirectory, 'src/styles/globals.css'), 'utf8'),
    readFile(path.join(directory, 'showtape-mark.svg'), 'utf8'),
  ]);
  const publishedText = `${html}\n${script}\n${demoStyles}\n${copiedGlobals}`;

  for (const [name, value] of [
    ['local-data disclosure', 'Demo data · Runs entirely in this browser · No external requests'],
    ['import stage', 'data-state="import"'],
    ['preview stage', 'data-state="preview"'],
    ['match stage', 'data-state="match"'],
    ['export stage', 'data-state="export"'],
    ['success stage', 'data-state="success"'],
    ['success disclaimer', 'No Apple Music playlist was created.'],
    ['fixture richness', "title: 'Violet Hour'"],
    ['match search action', 'toggleSearch:'],
    ['skip action', 'skip:'],
    ['editable playlist control', 'id="playlist-name"'],
    ['local form handling', "addEventListener('submit'"],
    ['safe search value assignment', 'input.value = query'],
  ]) {
    assertContains(html + script, name, value);
  }
  if ((script.match(/title: '/g) ?? []).length < 12) {
    throw new Error('Demo check failed: local fixture must contain at least twelve tracks.');
  }
  if (copiedGlobals !== sourceGlobals) {
    throw new Error(
      'Demo check failed: globals.css is not an exact copy of the production visual system.'
    );
  }
  assertSafeHtml(html);
  assertSafeStyles(demoStyles, 'demo.css');
  assertSafeStyles(copiedGlobals, 'globals.css');
  assertSafeSvg(svg);
  assertDoesNotMatch(
    publishedText,
    'unsafe DOM markup APIs are not allowed',
    /\b(?:innerHTML|outerHTML|insertAdjacentHTML|DOMParser|eval)\b/
  );
  assertDoesNotMatch(
    publishedText,
    'network, navigation, or external runtime APIs are not allowed',
    /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|MusicKit|localStorage|sessionStorage|indexedDB|Image|location|window\.open)\b/
  );
  assertDoesNotMatch(publishedText, 'external URLs are not allowed', /(?:https?:)?\/\/|\bwww\./i);
  assertDoesNotMatch(
    publishedText,
    'guided screenshot or concept-preview residue is not allowed',
    /guided[-\s]?demo|click-through|screenshot|concept preview|\(simulated\)|static demo/i
  );
}

const temporaryDirectory = await mkdtemp(path.join(rootDirectory, '.pages-demo-'));
let published = false;

try {
  await buildArtifact(temporaryDirectory);
  await validateArtifact(temporaryDirectory);
  if (!check) {
    await mkdir(path.dirname(publishedOutputDirectory), { recursive: true });
    await rm(publishedOutputDirectory, { recursive: true, force: true });
    await rename(temporaryDirectory, publishedOutputDirectory);
    published = true;
  }
  console.log(
    `Built static demo in ${path.relative(rootDirectory, check ? temporaryDirectory : publishedOutputDirectory)}${check ? ' and checked it' : ''}.`
  );
} finally {
  if (!published) await rm(temporaryDirectory, { recursive: true, force: true });
}
