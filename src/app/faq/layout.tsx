import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '常见问题 - 职途星FAQ',
  description: '职途星常见问题解答，涵盖账户注册、会员服务、AI功能使用、邀请奖励、技术支持等分类，快速解决你的使用疑问。',
  alternates: {
    canonical: 'https://432b6b32-abdf-4fba-9528-738980f50a36.dev.coze.site/faq',
  },
};

export default function FaqLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
