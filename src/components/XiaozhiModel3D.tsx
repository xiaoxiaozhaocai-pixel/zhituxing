'use client';

import { useEffect, useState } from 'react';

/**
 * 小职 3D 形象组件（悬浮球 / 聊天框挂件共用）
 *
 * - model-viewer Web Component 仅客户端 dynamic import，双层保险不进 SSR
 * - 移动端（<768px）直接渲染 2D 占位图，不加载 3D chunk 和 glb（省流量）
 * - 模型经 gltf-transform 压缩（meshopt+webp）：4.37MB → ~500KB，HTTP 缓存共享
 * - 悬浮球场景禁用 auto-rotate / camera-controls：小尺寸旋转易晕，且点击需冒泡给展开按钮
 */
interface XiaozhiModel3DProps {
  /** 模型加载前/降级时的 2D 占位图 */
  poster?: string;
}

export default function XiaozhiModel3D({ poster = '/models/xiaozhi_poster.webp' }: XiaozhiModel3DProps) {
  const [ready, setReady] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    if (!isDesktop) return;
    let cancelled = false;
    import('@google/model-viewer')
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        // 加载失败静默降级 2D 占位图
      });
    return () => {
      cancelled = true;
    };
  }, [isDesktop]);

  if (!isDesktop || !ready) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={poster}
        alt="小职"
        className="w-full h-full object-contain select-none"
        draggable={false}
      />
    );
  }

  return (
    <model-viewer
      src="/models/xiaozhi.glb"
      poster={poster}
      alt="小职 3D 形象"
      shadow-intensity="0.9"
      exposure="1.05"
      style={{ width: '100%', height: '100%', background: 'transparent', outline: 'none' }}
    />
  );
}
