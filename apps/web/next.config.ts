import type { NextConfig } from 'next';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@repo/core', '@repo/shared', 'api'],
  turbopack: { root: repoRoot },
  // Next 16+: set cacheComponents: true for PPR and use cache; see docs/tech/cache-components.md
};

export default nextConfig;
