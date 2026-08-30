import { Metadata } from 'next';
import { SITE_URL } from '@/lib/config';

export const metadata: Metadata = {
  title: '岗位列表 - 全行业海量岗位实时查询',
  description: '全行业海量岗位实时查询，覆盖互联网、金融、教育、制造等领域。AI智能解读岗位描述，一键匹配你的技能与心仪岗位，精准高效求职。',
  openGraph: {
    title: '岗位列表 | 职途星',
    description: '全行业海量岗位实时查询，覆盖互联网、金融、教育、制造等领域。AI智能解读岗位描述，一键匹配你的技能与心仪岗位，精准高效求职。',
    locale: 'zh_CN',
    type: 'website',
    siteName: '职途星',
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: '岗位列表 | 职途星',
    description: '全行业海量岗位实时查询，覆盖互联网、金融、教育、制造等领域。AI智能解读岗位描述，一键匹配你的技能与心仪岗位，精准高效求职。',
  },
  alternates: {
    canonical: `${SITE_URL}/jobs`,
  },
};

export default function JobsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
