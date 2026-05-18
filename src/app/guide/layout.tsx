import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '使用指南 - 快速上手职途星',
  description: '职途星使用指南，5步快速上手AI职业规划、模拟面试、能力测评等核心功能，助你高效利用AI工具提升求职竞争力。',
  alternates: {
    canonical: 'https://432b6b32-abdf-4fba-9528-738980f50a36.dev.coze.site/guide',
  },
};

export default function GuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
