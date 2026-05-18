import { Metadata } from 'next';

export const metadata: Metadata = {
  title: { absolute: '会员服务 - 解锁全部AI求职功能 | 职途星' },
  description: '职途星会员服务，解锁AI职业规划、模拟面试、岗位匹配等全部高级功能，月度会员仅需9.9元，畅享无限次AI求职服务。',
  alternates: {
    canonical: 'https://432b6b32-abdf-4fba-9528-738980f50a36.dev.coze.site/membership',
  },
};

export default function MembershipLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
