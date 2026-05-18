import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '个人中心 - 管理你的求职档案',
  description: '在职途星个人中心管理你的求职档案，查看会员状态与使用配额，追踪AI职业规划进度和测评结果，一站式管理你的求职全流程。',
  alternates: {
    canonical: 'https://432b6b32-abdf-4fba-9528-738980f50a36.dev.coze.site/profile',
  },
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
