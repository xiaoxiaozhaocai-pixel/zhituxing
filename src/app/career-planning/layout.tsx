import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI职业规划 - 智能分析职业方向',
  description: '职途星AI职业规划服务，基于你的专业背景、技能特长和求职意向，智能分析最适合你的职业发展方向。生成个性化职业发展路径，提供阶段性目标和能力提升建议，助你科学规划职业生涯。',
};

export default function CareerPlanningLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
