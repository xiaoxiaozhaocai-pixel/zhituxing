import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '服务条款 - 职途星',
  description: '职途星服务条款，了解使用本平台服务的权利与义务，包括服务说明、使用规范、知识产权等重要条款。',
  alternates: {
    canonical: 'https://t498zk3cs9.coze.site/terms',
  },
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
