import OneJdClient from './OneJdClient';

/**
 * C8 一岗一策 · 页面入口（Server Component，仅承载 SEO metadata）
 * 核心交互在 OneJdClient（客户端组件）
 */

export const metadata = {
  title: '一岗一策 — 职途星',
  description: '懂桂电学生的AI朋友——小职，陪你走好求职每一步',
};

export default function OneJdPage() {
  return <OneJdClient />;
}
