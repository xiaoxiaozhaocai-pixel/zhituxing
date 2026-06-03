import { Metadata } from 'next';
import { SITE_URL } from '@/lib/config';

export const metadata: Metadata = {
  title: '个人中心 - 管理你的求职档案',
  description: '在职途星个人中心管理你的求职档案，查看会员状态与使用配额，追踪AI职业规划进度和测评结果，一站式管理你的求职全流程。',
  alternates: {
    canonical: `${SITE_URL}/profile`,
  },
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
