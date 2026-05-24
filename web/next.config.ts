import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname, '..'),  // tells Turbopack the repo root is one level up
  },
};

export default nextConfig;