import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '职搭子JD助手 - 全行业岗位智能查询',
  description: '职搭子是职途星旗下的AI岗位查询助手，覆盖全行业9546+真实招聘JD数据。智能搜索岗位信息，分析技能要求、薪资范围、发展前景，为大学生提供精准的岗位推荐和求职指导服务。',
};

export default function AssistantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
