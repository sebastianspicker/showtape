import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { checkArchitecture } from '../../scripts/check-architecture.mjs';

type SourceTree = Record<string, string>;

const sourceTrees = {
  forbiddenAlias: {
    'src/domain/value.ts':
      "import { serverValue } from '@/server/value';\n\nexport const domainValue = serverValue;\n",
    'src/server/value.ts': "export const serverValue = 'server';\n",
  },
  forbiddenRelative: {
    'src/domain/value.ts':
      "import { serverValue } from '../server/value';\n\nexport const domainValue = serverValue;\n",
    'src/server/value.ts': "export const serverValue = 'server';\n",
  },
  cycle: {
    'src/contracts/a.ts': "export const a = 'a';\nexport { b } from './b';\n",
    'src/contracts/b.ts': "export const b = 'b';\nexport { a } from './a';\n",
  },
  domainReact: {
    'src/domain/value.ts': "import React from 'react';\n\nexport const domainValue = React;\n",
  },
  httpNextServer: {
    'src/http/value.ts':
      "import { NextResponse } from 'next/server';\n\nexport const response = NextResponse;\n",
  },
  unknownLayer: {
    'src/legacy/value.ts': "export const legacyValue = 'legacy';\n",
  },
  forbiddenProxy: {
    'src/proxy.ts':
      "import { serverValue } from '@/server/value';\n\nexport const proxyValue = serverValue;\n",
    'src/server/value.ts': "export const serverValue = 'server';\n",
  },
  allowedProxySecurity: {
    'src/instrumentation.ts': "export { initialize } from './server/security/csp';\n",
    'src/proxy.ts':
      "import { initialize } from './server/security/csp';\n\nexport const proxyValue = initialize();\n",
    'src/server/security/csp.ts':
      "import { join } from 'node:path';\nimport { hash } from './artifact.mjs';\n\nexport const initialize = () => hash(join('a', 'b'));\n",
    'src/server/security/artifact.mjs':
      "import { createHash } from 'node:crypto';\n\nexport const hash = (value) => createHash('sha256').update(value).digest('hex');\n",
  },
  forbiddenSecurityExternal: {
    'src/server/security/artifact.mjs':
      "import React from 'react';\n\nexport const artifact = React;\n",
  },
} satisfies Record<string, SourceTree>;

const testDirectory = fileURLToPath(new URL('.', import.meta.url));
const repositoryRoot = resolve(testDirectory, '../..');
const checker = resolve(repositoryRoot, 'scripts/check-architecture.mjs');

function runCheck(root: string) {
  try {
    return {
      status: 0,
      output: execFileSync(process.execPath, [checker, '--root', root], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 20_000,
      }),
    };
  } catch (error) {
    const processError = error as { status: number; stderr: string | Buffer };
    return { status: processError.status, output: processError.stderr.toString() };
  }
}

function checkSourceTree(name: keyof typeof sourceTrees) {
  const root = mkdtempSync(join(tmpdir(), 'showtape-architecture-'));
  try {
    for (const [relativePath, contents] of Object.entries(sourceTrees[name])) {
      const filePath = join(root, relativePath);
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, contents);
    }
    return checkArchitecture(root);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
}

describe('architecture check', () => {
  it('runs successfully from the command line against the live source tree', () => {
    expect(runCheck(repositoryRoot)).toMatchObject({ status: 0, output: '' });
  }, 30_000);

  it('rejects forbidden alias imports', () => {
    expect(checkSourceTree('forbiddenAlias').diagnostics).toContain(
      'src/domain/value.ts:1 domain cannot import server (@/server/value)'
    );
  });

  it('rejects forbidden relative imports', () => {
    expect(checkSourceTree('forbiddenRelative').diagnostics).toContain(
      'src/domain/value.ts:1 domain cannot import server (../server/value)'
    );
  });

  it('rejects circular source dependencies', () => {
    expect(checkSourceTree('cycle').diagnostics).toContain(
      'cycle: src/contracts/a.ts -> src/contracts/b.ts -> src/contracts/a.ts'
    );
  });

  it('rejects React in the domain layer', () => {
    expect(checkSourceTree('domainReact').diagnostics).toContain(
      'src/domain/value.ts:1 domain cannot import external react'
    );
  });

  it('rejects Next server imports in the HTTP layer', () => {
    expect(checkSourceTree('httpNextServer').diagnostics).toContain(
      'src/http/value.ts:1 http cannot import external next/server'
    );
  });

  it('rejects source files outside the defined layers', () => {
    expect(checkSourceTree('unknownLayer').diagnostics).toContain(
      'src/legacy/value.ts has no architecture layer'
    );
  });

  it('rejects proxy dependencies on server internals', () => {
    expect(checkSourceTree('forbiddenProxy').diagnostics).toContain(
      'src/proxy.ts:1 proxy cannot import server (@/server/value)'
    );
  });

  it('allows the proxy and instrumentation entry points to use the server security layer', () => {
    expect(checkSourceTree('allowedProxySecurity').diagnostics).toEqual([]);
  });

  it('checks mjs security sources while allowing Node builtins', () => {
    expect(checkSourceTree('forbiddenSecurityExternal').diagnostics).toContain(
      'src/server/security/artifact.mjs:1 server-security cannot import external react'
    );
  });
});
