import { Metadata } from 'next';
import { SITE_URL } from '@/lib/config';

export const metadata: Metadata = {
  title: '常见问题 - 职途星FAQ',
  description: '职途星常见问题解答，涵盖账户注册、会员服务、AI功能使用、邀请奖励、技术支持等分类，快速解决你的使用疑问。',
  openGraph: {
    title: '常见问题 | 职途星',
    description: '职途星常见问题解答，涵盖账户注册、会员服务、AI功能使用、邀请奖励、技术支持等分类，快速解决你的使用疑问。',
    locale: 'zh_CN',
    type: 'website',
    siteName: '职途星',
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: '常见问题 | 职途星',
    description: '职途星常见问题解答，涵盖账户注册、会员服务、AI功能使用、邀请奖励、技术支持等分类，快速解决你的使用疑问。',
  },
  alternates: {
    canonical: `${SITE_URL}/faq`,
  },
};

export default function FaqLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
