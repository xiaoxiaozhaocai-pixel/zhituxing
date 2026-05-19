import { Metadata } from 'next';
import { SITE_URL } from '@/lib/config';

export const metadata: Metadata = {
  title: '隐私政策 - 职途星',
  description: '职途星隐私政策，了解我们如何收集、使用和保护您的个人信息，保障您的数据安全与隐私权益。',
  alternates: {
    canonical: 'https://t498zk3cs9.coze.site/privacy',
  },
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
