'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/* ─── 类型 ─── */
interface ModuleUsage {
  name: string;
  key: string;
  count: number;
  rate: number;
  status: 'healthy' | 'warning' | 'low';
}

interface DecisionRule {
  rule: string;
  action: string;
  modules: string[];
}

interface UsageData {
  modules: ModuleUsage[];
  totalUsers: number;
  decisionRules: DecisionRule[];
  period: string;
}

/* ─── 状态徽章颜色 ─── */
const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  healthy:  { bg: 'bg-emerald-50',  text: 'text-emerald-700',  border: 'border-emerald-200',  label: '🟢 健康' },
  warning:  { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   label: '🟡 关注' },
  low:      { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     label: '🔴 危险' },
};

/* ─── 进度条颜色 ─── */
function getBarColor(status: string): string {
  if (status === 'healthy') return 'bg-emerald-500';
  if (status === 'warning') return 'bg-amber-500';
  return 'bg-red-500';
}

function getBarBgColor(status: string): string {
  if (status === 'healthy') return 'bg-emerald-100';
  if (status === 'warning') return 'bg-amber-100';
  return 'bg-red-100';
}

/* ─── 图标映射 ─── */
const MODULE_ICONS: Record<string, string> = {
  chat_send: '💬',
  interview_complete: '🎤',
  course_start: '📚',
  resume_create: '📝',
  job_view: '💼',
};

/* ─── SVG 环形图 ─── */
function DonutRing({ rate, status }: { rate: number; status: string }) {
  const size = 72;
  const strokeW = 6;
  const r = (size - strokeW) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (rate / 100) * circumference;

  const colorMap: Record<string, string> = {
    healthy: '#10B981',
    warning: '#F59E0B',
    low: '#EF4444',
  };
  const strokeColor = colorMap[status] || '#94A3B8';

  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1F5F9" strokeWidth={strokeW} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeW}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text
        x={size / 2}
        y={size / 2 + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-[#1E293B]"
        style={{ fontSize: '14px', fontWeight: 700 }}
      >
        {rate}%
      </text>
    </svg>
  );
}

/* ─── 页面主体 ─── */
export default function AdminUsagePage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState(30);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/analytics/usage?days=${days}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.message || '加载失败');
      }
    } catch (err: any) {
      setError(err.message || '网络异常');
    } finally {
      setLoading(false);
    }
  }

  const modules = data?.modules || [];
  const totalUsers = data?.totalUsers || 0;
  const decisionRules = data?.decisionRules || [];
  const period = data?.period || `${days}天`;

  return (
    <div className="space-y-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">使用率分析</h1>
          <p className="text-[#64748B] text-sm mt-1">
            各功能模块使用率统计 · 数据闭环决策
          </p>
        </div>
        <div className="flex items-center gap-2">
          {[
            { label: '7天', value: 7 },
            { label: '14天', value: 14 },
            { label: '30天', value: 30 },
            { label: '90天', value: 90 },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDays(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-sm transition border ${
                days === opt.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-[#64748B] border-[#E2E8F0] hover:bg-[#F8FAFC]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center text-[#64748B] py-20">加载中...</div>
      ) : error ? (
        <div className="text-center text-red-500 py-20">加载失败：{error}</div>
      ) : (
        <>
          {/* 总览条 */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-5 text-white shadow-md">
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <p className="text-blue-100 text-sm">总活跃用户数</p>
                <p className="text-3xl font-bold">{totalUsers.toLocaleString()}</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-blue-100 text-sm">统计周期</p>
                <p className="text-lg font-semibold">近{period}</p>
              </div>
              <div>
                <p className="text-blue-100 text-sm">覆盖模块</p>
                <p className="text-lg font-semibold">{modules.length} 个</p>
              </div>
            </div>
          </div>

          {/* 模块卡牌 */}
          {modules.length === 0 ? (
            <Card className="bg-white border-[#E2E8F0] shadow-sm">
              <CardContent className="py-12 text-center text-[#64748B]">
                暂无使用数据
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {modules.map((mod) => {
                const statusStyle = STATUS_STYLES[mod.status];
                return (
                  <Card
                    key={mod.key}
                    className={`bg-white border shadow-sm hover:shadow-md transition ${statusStyle.border}`}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{MODULE_ICONS[mod.key] || '📦'}</span>
                          <div>
                            <h3 className="font-semibold text-[#1E293B] text-sm">{mod.name}</h3>
                            <p className="text-xs text-[#94A3B8]">{mod.key}</p>
                          </div>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle.bg} ${statusStyle.text}`}
                        >
                          {statusStyle.label}
                        </span>
                      </div>

                      {/* 环形 + 数据 */}
                      <div className="flex items-center gap-4">
                        <DonutRing rate={mod.rate} status={mod.status} />
                        <div className="flex-1 space-y-1.5">
                          <div>
                            <p className="text-2xl font-bold text-[#1E293B]">{mod.rate}%</p>
                            <p className="text-xs text-[#94A3B8]">使用率</p>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#64748B]">{mod.count.toLocaleString()}</p>
                            <p className="text-xs text-[#94A3B8]">使用人数</p>
                          </div>
                        </div>
                      </div>

                      {/* 进度条 */}
                      <div className="mt-3">
                        <div className={`h-2 rounded-full ${getBarBgColor(mod.status)} overflow-hidden`}>
                          <div
                            className={`h-full rounded-full ${getBarColor(mod.status)} transition-all duration-700`}
                            style={{ width: `${Math.min(mod.rate, 100)}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* 决策规则表 */}
          {decisionRules.length > 0 && (
            <Card className="bg-white border-[#E2E8F0] shadow-sm">
              <CardHeader>
                <CardTitle className="text-[#1E293B] text-base flex items-center gap-2">
                  <span>🧠</span> 数据闭环决策规则
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E2E8F0]">
                        <th className="text-left py-3 px-4 text-[#64748B] font-medium w-32">判定规则</th>
                        <th className="text-left py-3 px-4 text-[#64748B] font-medium w-52">建议动作</th>
                        <th className="text-left py-3 px-4 text-[#64748B] font-medium">涉及模块</th>
                      </tr>
                    </thead>
                    <tbody>
                      {decisionRules.map((rule, i) => (
                        <tr key={i} className="border-b border-[#F1F5F9] last:border-b-0">
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#F8FAFC] text-[#1E293B] font-mono text-xs">
                              {rule.rule}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[#475569]">{rule.action}</td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1.5">
                              {rule.modules.map((m) => (
                                <span
                                  key={m}
                                  className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100"
                                >
                                  {m}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
