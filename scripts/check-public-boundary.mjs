import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';

const FILE_ACCESS = {
  readFile: readFileSync,
  stat: statSync,
};

const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'])
  .toString('utf8')
  .split('\0')
  .filter(Boolean)
  .filter((file) => {
    try {
      return FILE_ACCESS.stat(file).isFile();
    } catch {
      return false;
    }
  });

const forbiddenPaths = [
  /(^|\/)\.DS_Store$/,
  /(^|\/)Thumbs\.db$/i,
  /(^|\/)\.env(?!\.example$)/,
  /\.(?:pem|key|p8|p12|pfx|cer|crt|der|mobileprovision|jks|keystore)$/i,
  /(^|\/)(?:credentials|secrets|private)(?:\/|$)/i,
  /(^|\/)(?:node_modules|coverage|test-results|playwright-report|blob-report)(?:\/|$)/,
  /(^|\/)(?:\.next|dist|build|out)(?:\/|$)/,
  /(^|\/)(?:\.agents|\.claude|\.codacy|\.codex|\.codegraph|\.cursor|\.kilo|\.serena)(?:\/|$)/,
  /(^|\/)AGENTS?[^/]*\.md$/i,
  /(^|\/)docs\/(?:audit|fixes|archive|local|private|internal|status)(?:\/|$)/,
  /(^|\/)(?:diagnostics|support-report)[^/]*\.json$/i,
];

const pathFindings = files.filter((file) => forbiddenPaths.some((pattern) => pattern.test(file)));
const contentFindings = [];
const privateKeyMarker = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/;
const absoluteHomePath = /(?:\/Users\/|\/home\/)[A-Za-z0-9._-]+\//;

for (const file of files) {
  if (file === '.env.example') continue;

  let content;
  try {
    content = FILE_ACCESS.readFile(file, 'utf8');
  } catch {
    continue;
  }

  if (privateKeyMarker.test(content)) contentFindings.push(`${file}: private-key marker`);
  if (absoluteHomePath.test(content)) contentFindings.push(`${file}: absolute home path`);
}

const findings = [
  ...pathFindings.map((file) => `${file}: forbidden public path`),
  ...contentFindings,
];

if (findings.length > 0) {
  console.error('Public-boundary check failed:');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(`Public-boundary check passed for ${files.length} publishable files.`);
