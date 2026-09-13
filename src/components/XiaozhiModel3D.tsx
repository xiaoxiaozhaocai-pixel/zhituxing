'use client';

import { useEffect, useState } from 'react';

/**
 * 小职 3D 形象（首页 HERO）
 *
 * - @google/model-viewer 是 Web Component，只能在客户端加载：
 *   外层用 next/dynamic { ssr:false } 引入本组件，内部再 dynamic import
 *   注册 <model-viewer> custom element，双层保险不进 SSR。
 * - 模型经 gltf-transform 压缩（meshopt + webp 纹理 1024）：4.37MB → ~500KB。
 *   model-viewer v3+ 内置 meshopt decoder，无需额外配置。
 * - poster 为静态渲染图，模型加载完成前显示，避免首屏空白。
 */
export default function XiaozhiModel3D() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import('@google/model-viewer')
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        // 加载失败时静默降级为 poster 静态图，不影响首页其他内容
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    // JS chunk 未加载时的静态占位（与 poster 同图，视觉无缝）
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/models/xiaozhi_poster.webp"
        alt="小职"
        className="w-full h-full object-contain select-none"
        draggable={false}
      />
    );
  }

  return (
    <model-viewer
      src="/models/xiaozhi.glb"
      poster="/models/xiaozhi_poster.webp"
      alt="小职 3D 形象"
      auto-rotate
      rotation-per-second="18deg"
      camera-controls
      disable-zoom
      disable-pan
      interaction-prompt="none"
      shadow-intensity="0.8"
      exposure="1.05"
      style={{ width: '100%', height: '100%', background: 'transparent', outline: 'none' }}
    />
  );
}
