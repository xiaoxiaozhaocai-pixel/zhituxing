import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { DispatchCardData } from './chat-shared';
import { dispatchTabRoute } from './chat-shared';

/** 引导卡片：小职对话里的 dispatch 事件渲染，点击跳转对应功能入口 */
export default function DispatchCard({ card }: { card: DispatchCardData }) {
  const target = card.url || dispatchTabRoute(card.tabId);
  return (
    <div className="mt-3 rounded-xl border border-blue-100 bg-gradient-to-br from-[#f8fafd] via-white to-[#f0f5ff]/40 p-4">
      <div className="text-sm font-semibold text-slate-900">{card.title}</div>
      {card.description && (
        <div className="mt-1 text-xs text-slate-600 leading-relaxed">{card.description}</div>
      )}
      {card.actionLabel && (
        <Link
          href={target}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] px-4 py-2 text-xs font-medium text-white shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md"
        >
          {card.actionLabel}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}
