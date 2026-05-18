import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '岗位列表 - 全行业海量岗位实时查询',
  description: '全行业海量岗位实时查询，覆盖互联网、金融、教育、制造等领域。AI智能解读岗位描述，一键匹配你的技能与心仪岗位，精准高效求职。',
  alternates: {
    canonical: 'https://432b6b32-abdf-4fba-9528-738980f50a36.dev.coze.site/jobs',
  },
};

export default function JobsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
