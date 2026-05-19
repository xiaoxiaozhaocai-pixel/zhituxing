import { Metadata } from 'next';
import { SITE_URL } from '@/lib/config';

export const metadata: Metadata = {
  title: { absolute: '联系我们 - 职途星团队 | 职途星' },
  description: '联系职途星团队，获取产品使用帮助、商务合作咨询或意见反馈。关注微信公众号或添加客服微信，我们随时为你解答疑问。',
  alternates: {
    canonical: `${SITE_URL}/contact`,
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
