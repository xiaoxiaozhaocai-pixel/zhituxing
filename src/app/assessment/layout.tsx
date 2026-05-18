import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '能力测评 - 6维胜任力评估',
  description: '职途星能力测评系统，通过专业能力、通用技能、沟通表达、团队协作、创新思维、执行能力6大维度全面评估你的胜任力。生成详细测评报告，发现优势短板，提供针对性提升建议。',
};

export default function AssessmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
