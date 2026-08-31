import type { Metadata } from 'next';
import IndustryMapClient from './IndustryMapClient';

export const metadata: Metadata = {
  title: '行业地图 — 全国公司与岗位面试情报（聚合脱敏）',
  description:
    '职途星行业地图：以中国地图可视化全国公司、岗位与面经情报。支持公司/岗位/行业/城市搜索，地图/列表双视图，脱敏聚合展示高频问题、答题水平分布与通过趋势。数据来自真实面经归档，守四真不编造。',
  keywords: [
    '行业地图',
    '面试情报',
    '面经',
    '求职地图',
    '公司面试',
    '岗位面经',
    '高频问题',
    '通过率',
    '大学生求职',
    '职途星',
  ],
  openGraph: {
    title: '行业地图 — 全国公司与岗位面试情报（聚合脱敏）',
    description:
      '职途星行业地图：不用一个个找，直接在地图上浏览全国公司与岗位的面试情报，支持搜索与双视图。',
    type: 'website',
  },
};

export default function IndustryMapPage() {
  return <IndustryMapClient />;
}
