import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  distDir: '.next',
  output: 'standalone',
  devIndicators: false,
  reactStrictMode: true,
  // 安全：移除 X-Powered-By 响应头
  poweredByHeader: false,
};

export default nextConfig;
