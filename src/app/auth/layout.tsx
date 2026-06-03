import { Metadata } from 'next';
import { SITE_URL } from '@/lib/config';

// 强制动态渲染，禁用 ISR 缓存，避免认证页间歇性 "This page couldn't load"
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '登录注册 - 开启你的AI求职之旅',
  description: '注册职途星账号，解锁AI职业规划、模拟面试、能力测评等全套求职功能。新用户注册即享免费体验，快速开启你的智能求职之旅。',
  alternates: {
    canonical: `${SITE_URL}/auth`,
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
