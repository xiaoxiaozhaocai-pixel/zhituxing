import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '技能画像 - 可视化你的职业技能树',
  description: 'AI分析你的职业技能，生成可视化技能画像。对比目标岗位要求，发现技能差距，制定个性化学习路径。',
};

export default function SkillPortraitLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
