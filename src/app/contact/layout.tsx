import { Metadata } from 'next';
import { SITE_URL } from '@/lib/config';

export const metadata: Metadata = {
  title: '联系我们 - 职途星团队',
  description: '联系职途星团队，获取产品使用帮助、商务合作咨询或意见反馈。关注微信公众号或添加客服微信，我们随时为你解答疑问。',
  openGraph: {
    title: '联系我们 - 职途星团队',
    description: '联系职途星团队，获取产品使用帮助、商务合作咨询或意见反馈。',
    url: `${SITE_URL}/contact`,
    siteName: '职途星',
    locale: 'zh_CN',
    type: 'website',
  },
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
