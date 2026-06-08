import type { Metadata, Viewport } from 'next';
import './globals.css';
import { FontPreload } from '@/components/FontPreload';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import FreeQuotaBadge from '@/components/FreeQuotaBadge';
import FloatingAICTA from '@/components/FloatingAICTA';
import ProfileGuideProvider from '@/components/ProfileGuideProvider';
import { Providers } from '@/components/Providers';
import { ToastProvider } from '@/hooks/useToast';
import { MembershipProvider } from '@/contexts/MembershipContext';

import CookieConsent from '@/components/CookieConsent';
import { SITE_URL } from '@/lib/config';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#165DFF' },
    { media: '(prefers-color-scheme: dark)', color: '#0F172A' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: '职途星 — 懂桂电学生的AI朋友 | 先想清楚再投简历',
    template: '%s | 职途星',
  },
  description:
    '大学生求职不焦虑。小职AI陪你做职业规划、技能匹配、模拟面试。20000+真实岗位覆盖27大行业，从迷茫到清晰，免费使用。',
  keywords: [
    '职业规划',
    '岗位搜索',
    '求职',
    'AI匹配',
    '技能分析',
    '大学生就业',
    '模拟面试',
    '能力测评',
    '职途星',
    '桂电',
    '桂林电子科技大学',
  ],
  authors: [{ name: '职途星团队', url: SITE_URL }],
  generator: '职途星',
  creator: '职途星',
  publisher: '职途星',
  openGraph: {
    title: '职途星 — 懂桂电学生的AI朋友',
    description:
      '大学生求职不焦虑。小职AI陪你做职业规划、技能匹配、模拟面试。免费使用，覆盖27大行业20000+真实岗位。',
    url: SITE_URL,
    locale: 'zh_CN',
    type: 'website',
    siteName: '职途星',
    images: [{ url: 'https://s.coze.cn/image/9JW8vCo1HrY/', width: 1200, height: 630, alt: '职途星 - 懂桂电学生的AI求职伙伴' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '职途星 — 懂桂电学生的AI朋友',
    description: '大学生求职不焦虑。小职AI陪你做职业规划、技能匹配、模拟面试。免费使用。',
    images: ['https://s.coze.cn/image/9JW8vCo1HrY/'],
  },
  alternates: {
    canonical: SITE_URL,
  },
  robots: {
    index: true,
    follow: true,
    'max-image-preview': 'large',
    'max-snippet': -1,
    'max-video-preview': -1,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const _isDev = process.env.COZE_PROJECT_ENV === 'DEV';

  return (
    <html lang="zh-CN">
      <body className={`antialiased`}>
        {/* 跳过导航链接 - WCAG 2.1 AA */}
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded focus:outline-none focus:ring-2 focus:ring-white">跳过导航</a>
        <FontPreload />
        {/* Organization JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "职途星",
              "url": SITE_URL,
              "description": "懂桂电学生的AI朋友——小职，陪你走好求职每一步",
              "logo": "https://s.coze.cn/image/9JW8vCo1HrY/",
              "foundingLocation": {
                "@type": "Place",
                "name": "桂林电子科技大学"
              },
              "sameAs": []
            })
          }}
        />
        {/* WebSite JSON-LD with search action */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "职途星",
              "url": SITE_URL,
              "description": "懂桂电学生的AI朋友——小职，陪你走好求职每一步",
              "potentialAction": {
                "@type": "SearchAction",
                "target": {
                  "@type": "EntryPoint",
                  "urlTemplate": `${SITE_URL}/search?q={search_term_string}`
                },
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
        <Providers>
          <ToastProvider>
            <MembershipProvider>
              <ProfileGuideProvider>
                <Navbar />
                <FreeQuotaBadge />
                <FloatingAICTA />
                {children}
                <Footer />
                <CookieConsent />
              </ProfileGuideProvider>
            </MembershipProvider>
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}

