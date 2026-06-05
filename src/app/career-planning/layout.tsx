import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/config';

export const metadata: Metadata = {
  title: 'AI职业规划 - 智能分析你的职业方向',
  description: '输入你的专业和兴趣，AI基于全行业真实岗位数据为你规划最优职业路径。覆盖27个行业20,000+岗位，精准匹配你的发展方向。',
  openGraph: {
    title: 'AI职业规划 | 职途星',
    description: '输入你的专业和兴趣，AI基于全行业真实岗位数据为你规划最优职业路径。覆盖27个行业20,000+岗位，精准匹配你的发展方向。',
    locale: 'zh_CN',
    type: 'website',
    siteName: '职途星',
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: 'AI职业规划 | 职途星',
    description: '输入你的专业和兴趣，AI基于全行业真实岗位数据为你规划最优职业路径。覆盖27个行业20,000+岗位，精准匹配你的发展方向。',
  },
};

export default function CareerPlanningLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
