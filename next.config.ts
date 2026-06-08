import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  distDir: '.next',
  output: 'standalone',
  devIndicators: false,
  reactStrictMode: true,
  // 安全：移除 X-Powered-By 响应头
  poweredByHeader: false,

  // Turbopack 根目录修正（workspace 多 lockfile 场景）
  turbopack: {
    root: __dirname,
  },

  // ============================================================
  // 性能优化（2026-05-29 P5 体验铁律 #1）
  // ============================================================
  // 1. tree-shaking 高频包，砍冗余 import（@radix 27 个组件 + lucide-react + recharts 是重灾区）
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-collapsible',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-hover-card',
      '@radix-ui/react-label',
      '@radix-ui/react-navigation-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-progress',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slider',
      '@radix-ui/react-slot',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toggle',
      '@radix-ui/react-tooltip',
    ],
  },

  // 2. 生产环境去除 console.log（保留 error/warn 便于线上排障）
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },

  // 3. 图片优化：开启 webp/avif 自动转码 + 响应式 srcset
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000,
  },

  // ============================================================
  // 安全响应头（P1-2 修复）
  // ============================================================
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ];
  },

  // ============================================================
  // 架构归位 P8：砍掉页面路由 → 重定向到对应智能体
  // ============================================================
  async redirects() {
    return [
      { source: "/career", destination: "/career-planning", permanent: true },

      // 被职搭子吃掉的页面 → /assistant
      { source: "/match", destination: "/assistant", permanent: true },
      { source: "/search", destination: "/assistant", permanent: true },
      { source: "/referrals", destination: "/assistant", permanent: true },
      { source: "/referrals/:id", destination: "/assistant", permanent: true },
      { source: "/upload-jd-reward", destination: "/assistant", permanent: true },

      // 被职业规划吃掉的页面 → /career-planning
      { source: "/skill-portrait", destination: "/career-planning", permanent: true },
      { source: "/skills-graph", destination: "/career-planning", permanent: true },
      { source: "/assessment", destination: "/career-planning", permanent: true },
      { source: "/assessment/:path*", destination: "/career-planning", permanent: true },
      { source: "/learning-path", destination: "/career-planning", permanent: true },
      { source: "/growth", destination: "/career-planning", permanent: true },

      // 引导页 → 首页（ProfileGuideProvider 已接管）
      { source: "/guide", destination: "/", permanent: true },
    ];
  },
};

const sentryConfig = {
  silent: !process.env.CI,
  org: process.env.SENTRY_ORG || 'zhituxing',
  project: process.env.SENTRY_PROJECT || 'javascript-nextjs',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  tunnelRoute: '/sentry-tunnel',
  widenClientFileUpload: true,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
};

export default process.env.SENTRY_AUTH_TOKEN
  ? withSentryConfig(nextConfig, sentryConfig)
  : nextConfig;
