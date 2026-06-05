import { Metadata } from 'next';
import { SITE_URL } from '@/lib/config';

export const metadata: Metadata = {
  title: '数据来源声明 - 职途星',
  description: '职途星岗位信息来源说明：所有岗位数据均来源于国聘网、国家24365大学生就业服务平台、中国公共招聘网、广西人才网等合规招聘平台。',
  alternates: {
    canonical: `${SITE_URL}/data-source`,
  },
};

export default function DataSourceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
