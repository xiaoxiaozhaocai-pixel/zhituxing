'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  TrendingUp, Users, Lock, Coins, Loader2, BarChart3,
  ArrowRight, RotateCw, Sparkles,
} from 'lucide-react';

interface DailyPoint {
  date: string;
  unlocks: number;
  consumed: number;
}

interface TopCandidate {
  candidate_user_id: string;
  unlock_count: number;
  last_unlocked_at: string;
}

interface StatsData {
  credit_balance: number;
  total_recharged: number;
  total_consumed: number;
  range_days: number;
  range_start: string;
  range_end: string;
  total_unlocks: number;
  unique_candidates: number;
  active_unlocks: number;
  daily_timeseries: DailyPoint[];
  top_repeat_candidates: TopCandidate[];
}

const RANGES = [
  { value: 7, label: '近 7 天' },
  { value: 30, label: '近 30 天' },
  { value: 90, label: '近 90 天' },
];

function StatCard({
  icon: Icon, label, value, hint, accent = 'blue',
}: {
  icon: typeof Coins;
  label: string;
  value: number | string;
  hint?: string;
  accent?: 'blue' | 'amber' | 'emerald' | 'rose';
}) {
  const cls = {
    blue: 'bg-[#165DFF]/8 text-[#165DFF]',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
  }[accent];
  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-[#165DFF]/10 p-5 shadow-sm hover:-translate-y-0.5 transition">
      <div className={`inline-flex w-9 h-9 rounded-lg items-center justify-center ${cls}`}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div className="mt-3 text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

function LineChart({ points }: { points: DailyPoint[] }) {
  // 简单 SVG 双线图
  const width = 720;
  const height = 220;
  const padL = 40, padR = 16, padT = 16, padB = 28;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const maxY = Math.max(
    1,
    ...points.map(p => Math.max(p.unlocks, p.consumed)),
  );
  const ticksY = 4;

  const x = (i: number) => padL + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => padT + innerH - (v / maxY) * innerH;

  const buildPath = (key: keyof DailyPoint) => {
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(Number(p[key]) || 0)}`).join(' ');
  };

  // 抽样 X 轴标签：仅显示首/中/末 3 个，避免拥挤
  const labels: Array<{ i: number; text: string }> = [];
  if (points.length > 0) {
    const idxs = points.length === 1 ? [0] : [0, Math.floor(points.length / 2), points.length - 1];
    for (const i of idxs) {
      const d = points[i].date.slice(5); // MM-DD
      labels.push({ i, text: d });
    }
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {/* 网格 + Y 轴刻度 */}
      {Array.from({ length: ticksY + 1 }).map((_, i) => {
        const v = (maxY / ticksY) * (ticksY - i);
        const yy = padT + (i / ticksY) * innerH;
        return (
          <g key={i}>
            <line x1={padL} y1={yy} x2={width - padR} y2={yy} stroke="#e2e8f0" strokeDasharray="3 3" strokeWidth={1} />
            <text x={padL - 6} y={yy + 4} fontSize="10" fill="#94a3b8" textAnchor="end">
              {Math.round(v)}
            </text>
          </g>
        );
      })}
      {/* X 轴标签 */}
      {labels.map(l => (
        <text key={l.i} x={x(l.i)} y={height - 10} fontSize="10" fill="#94a3b8" textAnchor="middle">
          {l.text}
        </text>
      ))}
      {/* 两条线 */}
      {points.length > 0 && (
        <>
          <path d={buildPath('unlocks')} fill="none" stroke="#165DFF" strokeWidth={2.2} />
          <path d={buildPath('consumed')} fill="none" stroke="#FF7D00" strokeWidth={2} strokeDasharray="4 3" />
          {points.map((p, i) => (
            <g key={`pt-${i}`}>
              <circle cx={x(i)} cy={y(p.unlocks)} r={2.5} fill="#165DFF" />
              <circle cx={x(i)} cy={y(p.consumed)} r={2} fill="#FF7D00" />
            </g>
          ))}
        </>
      )}
    </svg>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [rangeDays, setRangeDays] = useState(30);
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/employer/stats?range_days=${rangeDays}`, { credentials: 'include' })
      .then(async (r) => {
        const json = await r.json();
        if (cancelled) return;
        if (!json.ok) {
          if (json.code === 'UNAUTHORIZED') {
            router.push('/employer/auth/login');
            return;
          }
          setError(json.message || '加载失败');
          setData(null);
        } else {
          setData(json.data);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : '网络异常');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [rangeDays, router]);

  const avgUnitPrice = useMemo(() => {
    if (!data || data.total_recharged === 0) return null;
    // 占位：充值标价 ¥10/条，仅展示
    return 10;
  }, [data]);

  if (loading && !data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#165DFF] animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#165DFF]" />
            数据看板
          </h1>
          <p className="text-sm text-slate-500 mt-1">解锁趋势 · 候选人覆盖 · 余额健康度</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5 bg-slate-100/80 rounded-lg p-1">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRangeDays(r.value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  rangeDays === r.value
                    ? 'bg-white text-[#165DFF] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setRangeDays((v) => v)}
            className="p-2 rounded-md text-slate-500 hover:bg-slate-100 transition"
            title="刷新"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-700">
          {error}
        </div>
      )}

      {data && (
        <>
          {/* 概览 4 卡 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Coins} label="当前余额" value={data.credit_balance} accent="amber"
              hint={`累计充值 ${data.total_recharged} · 累计消耗 ${data.total_consumed}`} />
            <StatCard icon={TrendingUp} label="窗口内解锁" value={data.total_unlocks} accent="blue"
              hint={`${RANGES.find(r => r.value === rangeDays)?.label}`} />
            <StatCard icon={Users} label="独立候选人" value={data.unique_candidates} accent="emerald"
              hint={data.total_unlocks > 0 ? `复购率 ${Math.round((1 - data.unique_candidates / data.total_unlocks) * 100)}%` : '—'} />
            <StatCard icon={Lock} label="当前有效解锁" value={data.active_unlocks} accent="rose"
              hint="24h 内仍可访问" />
          </div>

          {/* 趋势图 */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-[#165DFF]/10 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#165DFF]" />
                解锁与消耗趋势
              </h2>
              <div className="flex items-center gap-4 text-xs">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#165DFF]" />
                  <span className="text-slate-600">解锁次数</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-0.5 border-t-2 border-dashed border-[#FF7D00]" />
                  <span className="text-slate-600">消耗条数</span>
                </span>
              </div>
            </div>
            {data.daily_timeseries.every(p => p.unlocks === 0 && p.consumed === 0) ? (
              <div className="py-16 text-center text-slate-400">
                <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">该窗口暂无数据</p>
                <Link
                  href="/employer/candidates"
                  className="inline-flex items-center gap-1.5 mt-4 text-sm text-[#165DFF] hover:underline"
                >
                  去发现候选人 <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <LineChart points={data.daily_timeseries} />
            )}
          </div>

          {/* 重复解锁 top */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-[#165DFF]/10 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#FF7D00]" />
                重复解锁 Top 候选人
              </h2>
              {avgUnitPrice && (
                <span className="text-xs text-slate-400">平均成本 ¥{avgUnitPrice}/条</span>
              )}
            </div>
            {data.top_repeat_candidates.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                暂无重复解锁记录（24h 内 cached 复用不计入）
              </div>
            ) : (
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                      <th className="px-3 py-2.5 font-medium">候选人</th>
                      <th className="px-3 py-2.5 font-medium">解锁次数</th>
                      <th className="px-3 py-2.5 font-medium text-right">最近解锁时间</th>
                      <th className="px-3 py-2.5 font-medium text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.top_repeat_candidates.map((c) => (
                      <tr key={c.candidate_user_id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                        <td className="px-3 py-3 font-mono text-xs text-slate-600">
                          {c.candidate_user_id.slice(0, 8)}…
                        </td>
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FF7D00]/10 text-[#FF7D00] text-xs font-medium">
                            ×{c.unlock_count}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right text-xs text-slate-400 whitespace-nowrap">
                          {new Date(c.last_unlocked_at).toLocaleString('zh-CN', { hour12: false })}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <Link
                            href={`/employer/candidates/${c.candidate_user_id}`}
                            className="inline-flex items-center gap-1 text-xs text-[#165DFF] hover:underline"
                          >
                            查看 <ArrowRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
