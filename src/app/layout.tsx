import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import FreeQuotaBadge from '@/components/FreeQuotaBadge';
import FloatingMembershipButton from '@/components/FloatingMembershipButton';
import ProfileGuideProvider from '@/components/ProfileGuideProvider';
import { Providers } from '@/components/Providers';
import { ToastProvider } from '@/hooks/useToast';
import { MembershipProvider } from '@/contexts/MembershipContext';

export const metadata: Metadata = {
  title: {
    default: '职途星——你的AI职业规划助手',
    template: '%s | 职途星',
  },
  description:
    '职途星是基于全行业真实招聘JD的AI职业规划助手，为大学生提供一站式求职服务。',
  keywords: [
    '职途星',
    'AI职业规划',
    '大学生求职',
    '岗位查询',
    '模拟面试',
    '职业规划',
    '应届生求职',
    '全行业岗位',
  ],
  authors: [{ name: '职途星团队' }],
  generator: '职途星',
  openGraph: {
    title: '职途星——你的AI职业规划助手',
    description:
      '基于500万+全行业真实职业数据智能分析，为你推荐最适合的职业方向。',
    locale: 'zh_CN',
    type: 'website',
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
        {isDev && <Inspector />}
        <Providers>
          <ToastProvider>
            <MembershipProvider>
              <ProfileGuideProvider>
                <Navbar />
                <FreeQuotaBadge />
                <FloatingMembershipButton />
                {children}
                <Footer />
              </ProfileGuideProvider>
            </MembershipProvider>
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
