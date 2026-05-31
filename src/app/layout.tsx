import type { Metadata } from 'next';
import './globals.css';
import { FontPreload } from '@/components/FontPreload';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import FreeQuotaBadge from '@/components/FreeQuotaBadge';
import FloatingMembershipButton from '@/components/FloatingMembershipButton';
import FloatingAICTA from '@/components/FloatingAICTA';
import ProfileGuideProvider from '@/components/ProfileGuideProvider';
import { Providers } from '@/components/Providers';
import { ToastProvider } from '@/hooks/useToast';
import { MembershipProvider } from '@/contexts/MembershipContext';
import InspectorWrapper from '@/components/InspectorWrapper';
import FirstVisitModal from '@/components/FirstVisitModal';
import CookieConsent from '@/components/CookieConsent';
import { SITE_URL } from '@/lib/config';

export const metadata: Metadata = {
  title: {
    default: '职途星 - 智能职业规划与岗位匹配平台',
    template: '%s | 职途星',
  },
  description:
    '基于AI的智能职业规划平台，提供岗位搜索、技能匹配、面试模拟等服务，帮助大学生精准规划职业路径。覆盖27大行业20000+真实岗位，AI智能匹配，精准推荐。',
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
  ],
  authors: [{ name: '职途星团队' }],
  generator: '职途星',
  openGraph: {
    title: '职途星 - 智能职业规划与岗位匹配平台',
    description:
      '基于AI的智能职业规划平台，提供岗位搜索、技能匹配、面试模拟等服务，帮助大学生精准规划职业路径。',
    locale: 'zh_CN',
    type: 'website',
    siteName: '职途星',
    images: [{ url: 'https://s.coze.cn/image/9JW8vCo1HrY/', width: 1200, height: 630, alt: '职途星 - 智能职业规划与岗位匹配平台' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '职途星 - 智能职业规划与岗位匹配平台',
    description: '基于AI的智能职业规划平台，提供岗位搜索、技能匹配、面试模拟等服务，帮助大学生精准规划职业路径。',
    images: ['https://s.coze.cn/image/9JW8vCo1HrY/'],
  },
  alternates: {
    canonical: SITE_URL,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.COZE_PROJECT_ENV === 'DEV';

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
              "description": "AI职业规划与模拟面试平台，大学生一站式求职服务",
              "logo": "https://s.coze.cn/image/9JW8vCo1HrY/"
            })
          }}
        />
        {/* WebSite JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "职途星",
              "url": SITE_URL
            })
          }}
        />
        {isDev && <InspectorWrapper />}
        <Providers>
          <ToastProvider>
            <MembershipProvider>
              <ProfileGuideProvider>
                <Navbar />
                <FreeQuotaBadge />
                <FloatingMembershipButton />
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
