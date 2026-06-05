import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '技能图谱 - 行业技能关系可视化',
  description: '探索行业技能关系图谱，了解技能间的关联与前置关系。AI推荐最优技能学习路径，高效提升职业竞争力。',
  openGraph: {
    title: '技能图谱 | 职途星',
    description: '探索行业技能关系图谱，了解技能间的关联与前置关系。AI推荐最优技能学习路径，高效提升职业竞争力。',
    locale: 'zh_CN',
    type: 'website',
    siteName: '职途星',
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: '技能图谱 | 职途星',
    description: '探索行业技能关系图谱，了解技能间的关联与前置关系。AI推荐最优技能学习路径，高效提升职业竞争力。',
  },
};

export default function SkillsGraphLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
