import { Metadata } from 'next';
import { SITE_URL } from '@/lib/config';

export const metadata: Metadata = {
  title: '使用指南 - 快速上手职途星',
  description: '职途星使用指南，5步快速上手AI职业规划、模拟面试、能力测评等核心功能，助你高效利用AI工具提升求职竞争力。',
  openGraph: {
    title: '使用指南 | 职途星',
    description: '职途星使用指南，5步快速上手AI职业规划、模拟面试、能力测评等核心功能，助你高效利用AI工具提升求职竞争力。',
    locale: 'zh_CN',
    type: 'website',
    siteName: '职途星',
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: '使用指南 | 职途星',
    description: '职途星使用指南，5步快速上手AI职业规划、模拟面试、能力测评等核心功能，助你高效利用AI工具提升求职竞争力。',
  },
  alternates: {
    canonical: `${SITE_URL}/guide`,
  },
};

export default function GuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
