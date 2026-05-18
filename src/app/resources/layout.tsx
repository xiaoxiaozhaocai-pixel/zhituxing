import { Metadata } from 'next';

export const metadata: Metadata = {
  title: { absolute: '学习资源 - 精选求职备考资料 | 职途星' },
  description: '职途星精选学习资源库，涵盖简历模板、面试技巧、行业报告、职业规划指南等备考资料，助你全面提升求职竞争力。',
  alternates: {
    canonical: 'https://432b6b32-abdf-4fba-9528-738980f50a36.dev.coze.site/resources',
  },
};

export default function ResourcesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
