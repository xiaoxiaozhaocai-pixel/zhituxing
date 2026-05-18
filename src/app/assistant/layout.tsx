import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '职搭子JD助手 - 全行业岗位智能查询',
  description: 'AI智能解读岗位描述，一键查询全行业11,000+真实招聘JD。覆盖互联网、金融、教育等27个行业，帮你快速了解岗位要求。',
};

export default function AssistantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
