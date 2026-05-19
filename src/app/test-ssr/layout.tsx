import { Metadata } from 'next';
import { SITE_URL } from '@/lib/config';

export const metadata: Metadata = {
  title: 'SSR测试 - 服务端渲染验证 | 职途星',
  description: '验证职途星平台是否支持服务端渲染（SSR）',
  alternates: {
    canonical: `${SITE_URL}/test-ssr`,
  },
};

export default function TestSSRLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
