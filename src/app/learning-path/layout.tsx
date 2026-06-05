import { Metadata } from 'next';
import { SITE_URL } from '@/lib/config';

export const metadata: Metadata = {
  title: '学习路径 - 个性化技能提升方案',
  description: 'AI根据你的职业目标和技能缺口，生成个性化学习路径与技能提升方案，推荐精准学习资源，助你高效补齐短板迈向理想岗位。',
  openGraph: {
    title: '学习路径 | 职途星',
    description: 'AI根据你的职业目标和技能缺口，生成个性化学习路径与技能提升方案，推荐精准学习资源，助你高效补齐短板迈向理想岗位。',
    locale: 'zh_CN',
    type: 'website',
    siteName: '职途星',
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: '学习路径 | 职途星',
    description: 'AI根据你的职业目标和技能缺口，生成个性化学习路径与技能提升方案，推荐精准学习资源，助你高效补齐短板迈向理想岗位。',
  },
  alternates: {
    canonical: `${SITE_URL}/learning-path`,
  },
};

export default function LearningPathLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
