import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SSR测试 - 服务端渲染验证 | 职途星',
  description: '验证职途星平台是否支持服务端渲染（SSR）',
  alternates: {
    canonical: 'https://432b6b32-abdf-4fba-9528-738980f50a36.dev.coze.site/test-ssr',
  },
};

export default function TestSSRLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
