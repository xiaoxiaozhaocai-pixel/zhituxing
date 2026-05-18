import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '岗位匹配 - AI精准推荐',
  description: '职途星AI岗位匹配引擎，根据你的技能画像、专业背景和求职意向，智能匹配最适合的岗位。展示匹配度评分、技能缺口分析、薪资范围估算，帮你快速锁定目标岗位，提升求职效率。',
};

export default function MatchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
