import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import ts from 'typescript';

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.mjs'];

const LAYER_RULES = {
  instrumentation: new Set(['server', 'server-security']),
  contracts: new Set(['contracts']),
  domain: new Set(['contracts', 'domain']),
  http: new Set(['contracts', 'http']),
  server: new Set(['contracts', 'domain', 'http', 'server']),
  'server-security': new Set(['server-security']),
  client: new Set(['client', 'content', 'contracts', 'domain', 'http']),
  content: new Set(['content']),
  ui: new Set(['content', 'contracts', 'domain', 'ui']),
  workflow: new Set(['client', 'content', 'contracts', 'domain', 'ui', 'workflow']),
  'app-api': new Set(['app-api', 'server']),
  app: new Set(['app', 'content', 'contracts', 'domain', 'ui', 'workflow']),
  proxy: new Set(['contracts', 'domain', 'http', 'proxy', 'server-security']),
};

const EXTERNAL_ALLOWLISTS = {
  contracts: [],
  domain: [],
  http: [],
  server: ['jose', 'next/server', 'node:'],
  'server-security': ['node:'],
  client: [],
  content: [],
  ui: ['react'],
  workflow: ['react'],
  'app-api': [],
  app: ['next', 'next/', 'react'],
  proxy: ['next/server'],
  instrumentation: [],
};

function isSourceFile(filePath) {
  return SOURCE_EXTENSIONS.includes(path.extname(filePath));
}

function isInside(parentPath, childPath) {
  const relativePath = path.relative(parentPath, childPath);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

function displayPath(rootDirectory, filePath) {
  return path.relative(rootDirectory, filePath).split(path.sep).join('/');
}

function sourceFiles(sourceDirectory) {
  const files = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(entryPath);
      } else if (entry.isFile() && isSourceFile(entryPath)) {
        files.push(path.resolve(entryPath));
      }
    }
  };

  visit(sourceDirectory);
  return files.sort();
}

function layerFor(sourceDirectory, filePath) {
  const relativePath = displayPath(sourceDirectory, filePath);
  if (relativePath === 'instrumentation.ts') return 'instrumentation';
  if (relativePath === 'proxy.ts') return 'proxy';
  if (relativePath.startsWith('server/security/')) return 'server-security';
  if (relativePath.startsWith('app/api/')) return 'app-api';
  if (relativePath.startsWith('app/')) return 'app';

  const topLevelDirectory = relativePath.split('/')[0];
  return Object.hasOwn(LAYER_RULES, topLevelDirectory) ? topLevelDirectory : null;
}

function isAllowedExternalImport(layer, specifier) {
  return EXTERNAL_ALLOWLISTS[layer].some(
    (allowed) =>
      specifier === allowed ||
      ((allowed.endsWith('/') || allowed.endsWith(':')) && specifier.startsWith(allowed))
  );
}

function resolveExistingFile(basePath) {
  const candidates = [basePath];
  if (!path.extname(basePath)) {
    for (const extension of SOURCE_EXTENSIONS) {
      candidates.push(`${basePath}${extension}`);
      candidates.push(path.join(basePath, `index${extension}`));
    }
  }

  return (
    candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile()) ?? null
  );
}

function resolveInternalSpecifier(sourceDirectory, filePath, specifier) {
  let basePath;
  if (specifier.startsWith('@/')) {
    basePath = path.join(sourceDirectory, specifier.slice(2));
  } else if (specifier.startsWith('.')) {
    basePath = path.resolve(path.dirname(filePath), specifier);
  } else {
    return { kind: 'external' };
  }

  const resolvedPath = resolveExistingFile(basePath);
  if (!resolvedPath) return { kind: 'unresolved' };
  if (!isInside(sourceDirectory, resolvedPath) || !isSourceFile(resolvedPath)) {
    return { kind: 'non-source' };
  }

  return { kind: 'source', path: path.resolve(resolvedPath) };
}

function importsIn(sourceFile) {
  const imports = [];
  const visit = (node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      imports.push({ kind: 'static', node, specifier: node.moduleSpecifier.text });
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const argument = node.arguments[0];
      imports.push({
        kind: 'dynamic',
        node,
        specifier: argument && ts.isStringLiteral(argument) ? argument.text : null,
      });
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return imports;
}

function locationFor(sourceFile, node) {
  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return position.line + 1;
}

function findCycles(graph) {
  const states = new Map();
  const stack = [];
  const cycles = new Set();

  const visit = (filePath) => {
    states.set(filePath, 'visiting');
    stack.push(filePath);
    for (const dependency of graph.get(filePath) ?? []) {
      const state = states.get(dependency);
      if (state === 'visiting') {
        const cycleStart = stack.indexOf(dependency);
        cycles.add([...stack.slice(cycleStart), dependency]);
      } else if (!state) {
        visit(dependency);
      }
    }
    stack.pop();
    states.set(filePath, 'visited');
  };

  for (const filePath of [...graph.keys()].sort()) {
    if (!states.has(filePath)) visit(filePath);
  }
  return [...cycles]
    .map((cycle) => cycle.join('\u0000'))
    .sort()
    .map((cycle) => cycle.split('\u0000'));
}

export function checkArchitecture(rootDirectory = process.cwd()) {
  const root = path.resolve(rootDirectory);
  const sourceDirectory = path.join(root, 'src');
  if (!existsSync(sourceDirectory)) {
    return { diagnostics: [`architecture: missing ${displayPath(root, sourceDirectory)}`] };
  }

  const diagnostics = [];
  const graph = new Map();
  for (const filePath of sourceFiles(sourceDirectory)) {
    const sourceText = readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true);
    const sourceLayer = layerFor(sourceDirectory, filePath);
    const dependencies = new Set();
    const sourceLabel = displayPath(root, filePath);
    if (!sourceLayer) {
      diagnostics.push(`${sourceLabel} has no architecture layer`);
    }

    for (const imported of importsIn(sourceFile)) {
      const line = locationFor(sourceFile, imported.node);
      if (imported.kind === 'dynamic' && !imported.specifier) {
        diagnostics.push(`${sourceLabel}:${line} dynamic import must use a string literal`);
        continue;
      }

      const resolution = resolveInternalSpecifier(sourceDirectory, filePath, imported.specifier);
      if (resolution.kind === 'external') {
        if (sourceLayer && !isAllowedExternalImport(sourceLayer, imported.specifier)) {
          diagnostics.push(
            `${sourceLabel}:${line} ${sourceLayer} cannot import external ${imported.specifier}`
          );
        }
        continue;
      }
      if (resolution.kind === 'unresolved') {
        diagnostics.push(`${sourceLabel}:${line} cannot resolve ${imported.specifier}`);
        continue;
      }
      if (resolution.kind !== 'source') continue;

      dependencies.add(resolution.path);
      const targetLayer = layerFor(sourceDirectory, resolution.path);
      if (sourceLayer && targetLayer && !LAYER_RULES[sourceLayer].has(targetLayer)) {
        diagnostics.push(
          `${sourceLabel}:${line} ${sourceLayer} cannot import ${targetLayer} (${imported.specifier})`
        );
      }
    }
    graph.set(filePath, dependencies);
  }

  for (const cycle of findCycles(graph)) {
    diagnostics.push(`cycle: ${cycle.map((filePath) => displayPath(root, filePath)).join(' -> ')}`);
  }
  return { diagnostics: diagnostics.sort() };
}

function parseRootArgument(argumentsList) {
  if (argumentsList.length === 0) return process.cwd();
  if (argumentsList.length === 2 && argumentsList[0] === '--root') return argumentsList[1];
  throw new Error('usage: node scripts/check-architecture.mjs [--root <directory>]');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = checkArchitecture(parseRootArgument(process.argv.slice(2)));
    if (result.diagnostics.length > 0) {
      process.stderr.write(
        `${result.diagnostics.map((diagnostic) => `architecture: ${diagnostic}`).join('\n')}\n`
      );
      process.exitCode = 1;
    }
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
