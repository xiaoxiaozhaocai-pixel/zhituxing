import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '关于我们 - 职途星',
  description: '职途星是专注于大学生求职的AI智能平台，由桂电学生团队打造，提供AI职业规划、模拟面试、岗位匹配等一站式服务。',
  alternates: {
    canonical: 'https://zhituxing.zeabur.app/about',
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
