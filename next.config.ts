import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbo: false,
  experimental: { turbo: false },
  distDir: '.next',
  output: 'standalone',
  devIndicators: false,
  reactStrictMode: true,
};

export default nextConfig;
