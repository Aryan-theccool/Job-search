import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The engine and dashboard never talk over the network — they share files
  // under ../data (see lib/paths.ts). Keep this config intentionally minimal.
  turbopack: {
    // This app is self-contained in web/ — pin the workspace root so Turbopack
    // does not get confused by the repository-root lockfile.
    root: __dirname,
  },
};

export default nextConfig;
