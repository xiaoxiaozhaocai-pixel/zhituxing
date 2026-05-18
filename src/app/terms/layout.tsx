import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '服务条款 - 职途星',
  description: '职途星服务条款，了解使用职途星平台服务的相关条款和条件。',
  alternates: { canonical: 'https://432b6b32-abdf-4fba-9528-738980f50a36.dev.coze.site/terms' },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
