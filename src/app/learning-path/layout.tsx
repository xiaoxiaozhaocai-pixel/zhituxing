import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '学习路径 - 个性化技能提升方案',
  description: 'AI根据你的职业目标和技能缺口，生成个性化学习路径与技能提升方案，推荐精准学习资源，助你高效补齐短板迈向理想岗位。',
  alternates: {
    canonical: 'https://432b6b32-abdf-4fba-9528-738980f50a36.dev.coze.site/learning-path',
  },
};

export default function LearningPathLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
