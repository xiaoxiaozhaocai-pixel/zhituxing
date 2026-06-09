'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ModuleUsage {
  module: string;
  label: string;
  users: number;
  percentage: number;
  status: 'healthy' | 'warning' | 'low';
}

interface DecisionRule {
  threshold: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
}

interface UsageData {
  modules: ModuleUsage[];
  totalUsers: number;
  decisionRules: DecisionRule[];
  period: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string; ring: string }> = {
  healthy: { bg: 'bg-green-50', text: 'text-green-700', label: '健康', ring: '#22C55E' },
  warning: { bg: 'bg-amber-50', text: 'text-amber-700', label: '观察', ring: '#F59E0B' },
  low: { bg: 'bg-red-50', text: 'text-red-700', label: '低使用', ring: '#EF4444' },
};

const MODULE_ICONS: Record<string, string> = {
  chat: '💬',
  interview: '🎯',
  resume: '📝',
  jobs: '💼',
};

function RingProgress({ percentage, color }: { percentage: number; color: string }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  return (
    <svg width="96" height="96" viewBox="0 0 96 96">
      <circle cx="48" cy="48" r={radius} fill="none" stroke="#E5E7EB" strokeWidth="8" />
      <circle
        cx="48" cy="48" r={radius}
        fill="none" stroke={color} strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 48 48)"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text x="48" y="48" textAnchor="middle" dominantBaseline="central" className="text-lg font-bold" fill="#1E293B">
        {percentage}%
      </text>
    </svg>
  );
}

const PERIOD_OPTIONS = [
  { value: '7', label: '7天' },
  { value: '14', label: '14天' },
  { value: '30', label: '30天' },
  { value: '90', label: '90天' },
];

export default function UsagePage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState('30');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics/usage?days=${days}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.message || '加载失败');
      }
    } catch {
      setError('网络错误，请检查API是否已部署');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* 统计概览 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-[#E2E8F0]">
          <CardContent className="py-4">
            <div className="text-sm text-[#64748B]">活跃用户</div>
            <div className="text-2xl font-bold text-[#1E293B] mt-1">
              {loading ? '...' : data?.totalUsers ?? '-'}
            </div>
            <div className="text-xs text-[#94A3B8] mt-0.5">近{days}天有交互</div>
          </CardContent>
        </Card>
        <Card className="border-[#E2E8F0]">
          <CardContent className="py-4">
            <div className="text-sm text-[#64748B]">健康模块</div>
            <div className="text-2xl font-bold text-green-600 mt-1">
              {loading ? '...' : data?.modules.filter((m) => m.status === 'healthy').length ?? '-'}
            </div>
            <div className="text-xs text-[#94A3B8] mt-0.5">使用率 &gt; 50%</div>
          </CardContent>
        </Card>
        <Card className="border-[#E2E8F0]">
          <CardContent className="py-4">
            <div className="text-sm text-[#64748B]">需观察</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">
              {loading ? '...' : data?.modules.filter((m) => m.status === 'warning').length ?? '-'}
            </div>
            <div className="text-xs text-[#94A3B8] mt-0.5">使用率 10%-50%</div>
          </CardContent>
        </Card>
        <Card className="border-[#E2E8F0]">
          <CardContent className="py-4">
            <div className="text-sm text-[#64748B]">低使用</div>
            <div className="text-2xl font-bold text-red-500 mt-1">
              {loading ? '...' : data?.modules.filter((m) => m.status === 'low').length ?? '-'}
            </div>
            <div className="text-xs text-[#94A3B8] mt-0.5">使用率 &lt; 10%</div>
          </CardContent>
        </Card>
      </div>

      {/* 时间范围切换 */}
      <div className="flex items-center gap-2">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setDays(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              days === opt.value
                ? 'bg-[#1E3A8A] text-white'
                : 'bg-white text-[#64748B] border border-[#E2E8F0] hover:border-[#1E3A8A]'
            }`}
          >
            {opt.label}
          </button>
        ))}
        <button
          onClick={fetchData}
          className="ml-auto px-3 py-1.5 rounded-lg text-sm text-[#1E3A8A] border border-[#1E3A8A] hover:bg-blue-50 transition"
        >
          刷新
        </button>
      </div>

      {/* 模块使用率 */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(data?.modules || Array(5).fill(null)).map((mod, i) => {
          if (!mod) {
            return (
              <Card key={i} className="border-[#E2E8F0] animate-pulse">
                <CardContent className="py-10 flex justify-center">
                  <div className="w-24 h-24 rounded-full bg-gray-100" />
                </CardContent>
              </Card>
            );
          }
          const style = STATUS_STYLES[mod.status] || STATUS_STYLES.low;
          return (
            <Card key={mod.module} className="border-[#E2E8F0] hover:shadow-md transition">
              <CardContent className="py-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{MODULE_ICONS[mod.module] || '📊'}</span>
                    <span className="font-medium text-[#1E293B]">{mod.label}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style!.bg} ${style!.text}`}>
                    {style!.label}
                  </span>
                </div>
                <div className="flex justify-center mb-3">
                  <RingProgress percentage={mod.percentage} color={style!.ring} />
                </div>
                <div className="flex justify-between text-xs text-[#94A3B8]">
                  <span>{mod.users} 用户</span>
                  <span>/ {data?.totalUsers || 0} 总计</span>
                </div>
                {/* 进度条 */}
                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${mod.percentage}%`,
                      backgroundColor: style!.ring,
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 决策规则表 */}
      <Card className="border-[#E2E8F0]">
        <CardHeader>
          <CardTitle className="text-[#1E293B] text-lg">📋 决策规则</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E2E8F0]">
                  <th className="text-left py-2 px-3 text-[#64748B] font-medium">使用率阈值</th>
                  <th className="text-left py-2 px-3 text-[#64748B] font-medium">建议动作</th>
                  <th className="text-left py-2 px-3 text-[#64748B] font-medium">优先级</th>
                </tr>
              </thead>
              <tbody>
                {(data?.decisionRules || []).map((rule, i) => (
                  <tr key={i} className="border-b border-[#F1F5F9]">
                    <td className="py-3 px-3 text-[#1E293B]">{rule.threshold}</td>
                    <td className="py-3 px-3 text-[#475569]">{rule.action}</td>
                    <td className="py-3 px-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        rule.priority === 'high'
                          ? 'bg-red-50 text-red-600'
                          : rule.priority === 'medium'
                          ? 'bg-amber-50 text-amber-600'
                          : 'bg-blue-50 text-blue-600'
                      }`}>
                        {rule.priority === 'high' ? '紧急' : rule.priority === 'medium' ? '中等' : '常规'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 说明 */}
      <div className="text-xs text-[#94A3B8] p-4 bg-blue-50/50 rounded-lg border border-blue-100">
        <p className="font-medium text-blue-700 mb-1">📌 数据说明</p>
        <p>使用率 = 该模块活跃用户数 / 总活跃用户数。数据来源：Supabase messages + assessment_results 表。</p>
        <p>模块分类：小职对话（messages表全部用户）、模拟面试（assessment_results 含interview标记）、简历优化（messages含简历关键词）、岗位浏览（messages含岗位关键词）。</p>
      </div>
    </div>
  );
}
