import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '隐私政策 - 职途星',
  description: '职途星隐私政策，了解我们如何收集、使用和保护您的个人信息。',
  alternates: { canonical: 'https://432b6b32-abdf-4fba-9528-738980f50a36.dev.coze.site/privacy' },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
