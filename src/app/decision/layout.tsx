import { Metadata } from 'next';
import { SITE_URL } from '@/lib/config';

export const metadata: Metadata = {
  title: '考研与就业决策指南 | 职途星',
  description: '职途星考研与就业决策分析，基于个人能力评估、行业趋势和市场需求，帮你做出明智的职业选择。科学对比考研与直接就业的优劣。',
  alternates: {
    canonical: `${SITE_URL}/decision`,
  },
  openGraph: {
    title: '考研与就业决策指南 | 职途星',
    description: '基于个人能力评估、行业趋势和市场需求，帮你做出明智的职业选择',
    url: `${SITE_URL}/decision`,
    siteName: '职途星',
    locale: 'zh_CN',
    type: 'website',
  },
};

export default function DecisionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
