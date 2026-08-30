import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '岗位匹配 - AI精准推荐适合你的岗位',
  description: 'AI根据你的专业、技能和求职意向，从全行业真实岗位库中精准推荐最适合你的职位。匹配度评分，告别盲目投简历。',
  openGraph: {
    title: '岗位匹配 | 职途星',
    description: 'AI根据你的专业、技能和求职意向，从全行业真实岗位库中精准推荐最适合你的职位。匹配度评分，告别盲目投简历。',
    locale: 'zh_CN',
    type: 'website',
    siteName: '职途星',
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: '岗位匹配 | 职途星',
    description: 'AI根据你的专业、技能和求职意向，从全行业真实岗位库中精准推荐最适合你的职位。匹配度评分，告别盲目投简历。',
  },
};

export default function MatchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
