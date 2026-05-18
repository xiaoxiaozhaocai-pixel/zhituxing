import type { Metadata } from 'next';
import './globals.css';
import { FontPreload } from '@/components/FontPreload';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import FreeQuotaBadge from '@/components/FreeQuotaBadge';
import FloatingMembershipButton from '@/components/FloatingMembershipButton';
import ProfileGuideProvider from '@/components/ProfileGuideProvider';
import { Providers } from '@/components/Providers';
import { ToastProvider } from '@/hooks/useToast';
import { MembershipProvider } from '@/contexts/MembershipContext';
import InspectorWrapper from '@/components/InspectorWrapper';

export const metadata: Metadata = {
  title: {
    default: '职途星 - AI职业规划与模拟面试平台 | 大学生一站式求职服务',
    template: '%s | 职途星',
  },
  description:
    '职途星是专注于大学生求职的AI智能平台，提供AI职业规划、模拟面试、能力测评、岗位精准匹配等一站式服务。基于500万+真实招聘数据分析，助你科学规划职业方向，提升求职竞争力。',
  keywords: [
    '职途星',
    'AI职业规划',
    '大学生求职',
    '模拟面试',
    '能力测评',
    '岗位匹配',
    '职业规划',
    '应届生求职',
    '全行业岗位',
    '求职助手',
  ],
  authors: [{ name: '职途星团队' }],
  generator: '职途星',
  openGraph: {
    title: '职途星 - AI职业规划与模拟面试平台',
    description:
      '专注于大学生求职的AI智能平台，提供职业规划、模拟面试、能力测评、岗位匹配等一站式服务，助你科学规划职业方向。',
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
        <FontPreload />
        {isDev && <InspectorWrapper />}
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
