'use client';

import { useEffect, useRef, useState } from 'react';

export interface InsightsPanel {
  id: string;
  label: string;
  content: React.ReactNode;
}

/**
 * 内容库 Tab 容器 —— 解决单页 5 板块全量平铺过长过密的问题。
 * SEO 策略：5 个面板均由服务端全量渲染进 DOM，非激活面板仅用 hidden 视觉隐藏，
 * 爬虫可抓取全部内容；激活状态同步 URL hash（#industries 等），直链/分享/原锚点不受影响。
 */
export default function InsightsTabs({ panels }: { panels: InsightsPanel[] }) {
  const [active, setActive] = useState(panels[0]?.id ?? '');
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const applyHash = () => {
      const h = window.location.hash.replace('#', '');
      if (h && panels.some((p) => p.id === h)) {
        setActive(h);
        requestAnimationFrame(() => {
          barRef.current?.scrollIntoView({ block: 'start' });
        });
      }
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, [panels]);

  const switchTab = (id: string) => {
    setActive(id);
    history.replaceState(null, '', `#${id}`);
    requestAnimationFrame(() => {
      const top = barRef.current?.getBoundingClientRect().top ?? 0;
      if (top < 0 || top > 140) barRef.current?.scrollIntoView({ block: 'start' });
    });
  };

  return (
    <div>
      <div
        ref={barRef}
        className="sticky top-14 z-20 border-b border-[#E2E8F0] bg-white/80 backdrop-blur"
      >
        <div
          className="mx-auto flex max-w-7xl items-center justify-start gap-1 overflow-x-auto px-4 py-2.5 text-sm sm:justify-center"
          role="tablist"
          aria-label="内容库板块切换"
        >
          {panels.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={active === p.id}
              onClick={() => switchTab(p.id)}
              className={`shrink-0 rounded-full px-4 py-1.5 font-medium transition ${
                active === p.id
                  ? 'bg-[#165DFF] text-white shadow-sm'
                  : 'text-[#475569] hover:bg-[#165DFF]/5 hover:text-[#165DFF]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      {panels.map((p) => (
        <div key={p.id} id={p.id} role="tabpanel" aria-label={p.label} hidden={active !== p.id}>
          {p.content}
        </div>
      ))}
    </div>
  );
}
