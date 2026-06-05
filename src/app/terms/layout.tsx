import { Metadata } from 'next';
import { SITE_URL } from '@/lib/config';

export const metadata: Metadata = {
  title: '服务条款 - 职途星',
  description: '职途星服务条款，了解使用本平台服务的权利与义务，包括服务说明、使用规范、知识产权等重要条款。',
  alternates: {
    canonical: `${SITE_URL}/terms`,
  },
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
