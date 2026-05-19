import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  distDir: '.next',
  output: 'standalone',
  devIndicators: false,
  reactStrictMode: true,
};

export default nextConfig;
