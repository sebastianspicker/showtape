import { writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { collectArtifact } from '../src/server/security/csp-artifact.mjs';
const directory = join(process.cwd(), '.next');
const artifact = collectArtifact(directory);
const temporary = join(directory, 'csp-manifest.json.tmp');
writeFileSync(temporary, JSON.stringify(artifact), { mode: 0o444 });
renameSync(temporary, join(directory, 'csp-manifest.json'));
console.log(
  `CSP manifest: ${Object.keys(artifact.documents).length} documents, ${artifact.hashes.length} hashes`
);
