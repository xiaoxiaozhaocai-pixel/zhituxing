'use client';

import dynamic from 'next/dynamic';

/**
 * 性能优化（perf / 2026-08-31）：
 * FloatingAICTA 内部引用了 AIResponseRenderer → recharts 等重量级依赖，
 * 且作为全局浮动聊天入口常驻根布局，导致所有页面（含首页、resume-optimize）
 * 首屏都被迫加载 recharts（Lighthouse 实测 unused JS ~330KB / 可省 158KiB，
 * 且 LCP/TTI 超标：resume-optimize 实测 9.1s）。
 * 这里用 dynamic + ssr:false 懒加载，让这些重依赖不进入首屏关键路径，
 * 仅在客户端、用户交互时按需加载。
 */
const FloatingAICTA = dynamic(
  () => import('@/components/FloatingAICTA'),
  {
    ssr: false,
    loading: () => null,
  }
);

export default function FloatingAICTAWrapper() {
  return <FloatingAICTA />;
}
