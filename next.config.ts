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
  env: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'https://t498zk3cs9.coze.site',
    // 构建时的 Supabase fallback（仅用于 Next.js 构建时内联到客户端）
    // 注意：这些值会被内联到客户端代码中，所以使用 anon key 是安全的
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gpwekhlltsvoalmqzjyv.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdwd2VraGxsdHN2b2FsbXF6anl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTc3NDYsImV4cCI6MjA5MjMzMzc0Nn0.mYAEZo9kp_caWYzXexCBIrpFF7soCAG1stuqGWjJILQ',
  },
  turbopack: {},
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
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
