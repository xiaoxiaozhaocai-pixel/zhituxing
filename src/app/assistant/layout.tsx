import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '职搭子JD助手 - 全行业岗位智能查询',
  description: 'AI智能解读岗位描述，一键查询全行业20,000+真实招聘JD。覆盖互联网、金融、教育等27个行业，帮你快速了解岗位要求。',
  openGraph: {
    title: '职搭子JD助手 - 全行业岗位智能查询',
    description: 'AI智能解读岗位描述，一键查询全行业20,000+真实招聘JD。覆盖互联网、金融、教育等27个行业，帮你快速了解岗位要求。',
    locale: 'zh_CN',
    type: 'website',
    siteName: '职途星',
    images: [{ url: 'https://s.coze.cn/image/9JW8vCo1HrY/', width: 1200, height: 630, alt: '职搭子JD助手' }],
  },
  alternates: {
    canonical: 'https://t498zk3cs9.coze.site/assistant',
  },
};

export default function AssistantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
