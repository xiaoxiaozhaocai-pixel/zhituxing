import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '技能画像 - 可视化职业技能树',
  description: '职途星技能画像服务，AI智能分析你的专业技能、通用技能和软技能，生成可视化技能树。清晰展示技能掌握程度，发现能力短板，推荐学习路径，助你系统化提升职业竞争力。',
};

export default function SkillPortraitLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
