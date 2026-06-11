'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle, Circle, ArrowRight, Sparkles, TrendingUp, ChevronUp, ChevronDown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Agent {
  id: string;
  name: string;
  icon: string;
  desc: string;
  url: string;
  completed: boolean;
}

interface Status {
  hasProfile: boolean;
  agents: Agent[];
  completedCount: number;
  totalCount: number;
  completionPct: number;
  recommendedNext: (Agent & { reason: string }) | null;
}

export default function AgentChainStatus({ currentBot }: { currentBot?: string }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<Status | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    fetch('/api/agent-chain/status', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.success) setStatus(d.data as Status);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user || loading || !status) return null;

  return (
    <div className="mb-6 rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
      {/* 进度条头部 */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-[#f0f5ff] via-white to-[#fff7ed] flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <TrendingUp className="w-4 h-4 text-[#165DFF] shrink-0" />
            <span className="text-sm font-semibold text-[#1a1a1a]">
              你的能力链路进度
            </span>
            <span className="text-xs text-[#888]">
              {status.completedCount}/{status.totalCount} 已完成 ·{' '}
              {status.completionPct}%
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] transition-all duration-500 rounded-full"
              style={{ width: `${status.completionPct}%` }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="text-xs text-[#666] hover:text-[#165DFF] shrink-0 inline-flex items-center gap-1"
          aria-label={collapsed ? '展开链路' : '收起链路'}
        >
          {collapsed ? (
            <>
              展开 <ChevronDown className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              收起 <ChevronUp className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* 8 个智能体卡片 */}
          <div className="px-5 py-4 grid grid-cols-2 md:grid-cols-4 gap-2">
            {status.agents.map((a) => {
              const isCurrent = currentBot === a.id;
              return (
                <Link
                  key={a.id}
                  href={a.url}
                  className={`group flex items-center gap-2.5 p-2.5 rounded-xl border transition-all ${
                    a.completed
                      ? 'bg-green-50/60 border-green-200/60 hover:border-green-300 hover:shadow-sm'
                      : isCurrent
                        ? 'bg-[#165DFF]/5 border-[#165DFF]/30 ring-1 ring-[#165DFF]/20'
                        : 'bg-white border-gray-100 hover:border-[#165DFF]/30 hover:bg-[#165DFF]/5 hover:shadow-sm'
                  }`}
                >
                  <span className="text-base shrink-0" aria-hidden>
                    {a.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-[#1a1a1a] truncate">
                      {a.name}
                    </div>
                    <div className="text-[10px] text-[#888] truncate">
                      {a.desc}
                    </div>
                  </div>
                  {a.completed ? (
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-gray-300 shrink-0 group-hover:text-[#165DFF]" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* 推荐下一步 */}
          {status.recommendedNext && (
            <Link
              href={status.recommendedNext.url}
              className="block px-5 py-3 bg-gradient-to-r from-[#FFF7ED] via-[#FFFAF0] to-white border-t border-orange-100/50 hover:from-[#FFE8CC] hover:via-[#FFF1E0] transition-colors group"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#FF7D00] to-[#FFB800] flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-[#888] mb-0.5">小职推荐</div>
                    <div className="text-sm font-semibold text-[#1a1a1a] truncate">
                      接下来用「{status.recommendedNext.name}」·{' '}
                      <span className="text-[#666] font-normal">
                        {status.recommendedNext.reason}
                      </span>
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#FF7D00] shrink-0 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          )}
        </>
      )}
    </div>
  );
}
