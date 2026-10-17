import { join } from 'node:path';
import { validateArtifact } from './csp-artifact.mjs';

let initialized = false;
let hashes: readonly string[] | null = null;
/** Validate once per immutable server instance, including its actual HTML. */
export function initializeCsp(): readonly string[] | null {
  if (initialized) return hashes;
  initialized = true;
  try {
    hashes = validateArtifact(join(process.cwd(), '.next'));
  } catch (error) {
    console.error(
      'CSP artifact validation failed; serving 503 until the build is fixed:',
      error instanceof Error ? error.message : String(error)
    );
    hashes = null;
  }
  return hashes;
}
