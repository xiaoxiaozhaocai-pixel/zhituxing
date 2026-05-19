import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
        pathname: '/**',
      },
    ],
  },
  // 环境变量配置
  env: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || "https://t498zk3cs9.coze.site",
  },
  // 添加空的 turbopack 配置以支持自定义 webpack
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (isServer) {
      console.log('[BUILD CHECK] NEXT_PUBLIC_SUPABASE_URL:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
      console.log('[BUILD CHECK] NEXT_PUBLIC_SUPABASE_ANON_KEY:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      console.log('[BUILD CHECK] SUPABASE_SERVICE_ROLE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    }
    return config;
  },
};

export default nextConfig;
