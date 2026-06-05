import { Metadata } from 'next';
import { SITE_URL } from '@/lib/config';

export const metadata: Metadata = {
  title: { absolute: '会员服务 - 解锁全部AI求职功能 | 职途星' },
  description: '职途星会员服务，解锁AI职业规划、模拟面试、岗位匹配等全部高级功能，月度会员仅需9.9元，畅享无限次AI求职能力。',
  alternates: {
    canonical: `${SITE_URL}/membership`,
  },
};

export default function MembershipLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
