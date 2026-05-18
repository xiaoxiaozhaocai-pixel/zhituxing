import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '登录注册 - 开启你的AI求职之旅',
  description: '注册职途星账号，解锁AI职业规划、模拟面试、能力测评等全套求职功能。新用户注册即享免费体验，快速开启你的智能求职之旅。',
  alternates: {
    canonical: 'https://432b6b32-abdf-4fba-9528-738980f50a36.dev.coze.site/auth',
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
