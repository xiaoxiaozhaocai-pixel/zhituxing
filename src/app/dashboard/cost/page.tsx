'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

/* ─── 类型 ─── */
interface CostSummary {
  period: string;
  date_range: { start: string; end: string };
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
  total_cost_yuan: number;
  total_calls: number;
}

interface BotTypeItem {
  bot_type: string;
  prompt_tokens: number;
  completion_tokens: number;
  cost: number;
  calls: number;
}

interface CostData {
  success: boolean;
  summary: CostSummary;
  by_bot_type: BotTypeItem[];
  detail: any[];
}

/* ─── 工具 ─── */
function formatYuan(n: number): string {
  return `¥${n.toFixed(4)}`;
}

function formatTokens(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

const BOT_LABELS: Record<string, string> = {
  chat: '小职对话',
  career: '职业规划',
  interview: '模拟面试',
  assessment: '能力测评',
  decision: '决策助手',
  match: '岗位匹配',
  unknown: '未分类',
};

function botLabel(key: string): string {
  return BOT_LABELS[key] || key;
}

const BOT_COLORS = ['#3B82F6', '#8B5CF6', '#F97316', '#10B981', '#EC4899', '#06B6D4', '#94A3B8'];

/* ─── 指标卡片 ─── */
function MetricCard({ title, value, subtitle, icon, color }: {
  title: string; value: string; subtitle: string; icon: string; color: string;
}) {
  return (
    <Card className="bg-white border-[#E2E8F0] shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-[#64748B]">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            <p className="text-xs text-[#94A3B8] mt-1">{subtitle}</p>
          </div>
          <span className="text-2xl">{icon}</span>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── 自定义 Tooltip ─── */
function CostTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E2E8F0] shadow-lg rounded-lg p-3 text-sm">
      <p className="font-semibold text-[#1E293B] mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }} className="flex justify-between gap-4">
          <span>{entry.name}</span>
          <span className="font-mono">{entry.name === '费用(¥)' ? formatYuan(entry.value) : formatTokens(entry.value)}</span>
        </p>
      ))}
    </div>
  );
}

/* ─── 主页面 ─── */
export default function CostDashboardPage() {
  const [period, setPeriod] = useState<string>('daily');
  const [days, setDays] = useState(7);
  const [data, setData] = useState<CostData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cost/summary?period=${period}&days=${days}`);
      const json = await res.json();
      if (json.success) setData(json);
    } catch (err) {
      console.error('加载成本数据失败:', err);
    } finally {
      setLoading(false);
    }
  }, [period, days]);

  useEffect(() => { loadData(); }, [loadData]);

  const summary = data?.summary;
  const detail = data?.detail || [];
  const botData = data?.by_bot_type || [];

  // 图表数据
  const chartData = detail.map((d: any) => ({
    label: d.date ? d.date.slice(5) : d.week?.slice(5) || '',
    费用: Number(d.cost) || 0,
    Token: (Number(d.prompt_tokens) + Number(d.completion_tokens)) || 0,
    调用次数: Number(d.calls) || 0,
  }));

  // 有数据标记
  const hasData = detail.length > 0 || botData.length > 0;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">成本监控看板</h1>
          <p className="text-[#64748B] text-sm mt-1">DeepSeek API 消耗统计与趋势分析</p>
        </div>
        <div className="flex items-center gap-2">
          {[
            { label: '7天', value: 7 },
            { label: '14天', value: 14 },
            { label: '30天', value: 30 },
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

      {loading && !data ? (
        <div className="text-center text-[#64748B] py-20">加载中...</div>
      ) : (
        <>
          {/* 核心指标 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="总消耗"
              value={formatYuan(summary?.total_cost_yuan ?? 0)}
              subtitle={`${summary?.date_range.start} ~ ${summary?.date_range.end}`}
              icon="💰"
              color="text-blue-600"
            />
            <MetricCard
              title="Token 总量"
              value={formatTokens(summary?.total_tokens ?? 0)}
              subtitle={`输入 ${formatTokens(summary?.total_prompt_tokens ?? 0)} / 输出 ${formatTokens(summary?.total_completion_tokens ?? 0)}`}
              icon="📝"
              color="text-purple-600"
            />
            <MetricCard
              title="调用次数"
              value={`${summary?.total_calls ?? 0} 次`}
              subtitle="全量统计"
              icon="📡"
              color="text-cyan-600"
            />
            <MetricCard
              title="日均消耗"
              value={formatYuan(days > 0 ? (summary?.total_cost_yuan ?? 0) / Math.min(days, 30) : 0)}
              subtitle="按选定天数平均"
              icon="📊"
              color="text-green-600"
            />
          </div>

          {/* 图表区域 */}
          <Card className="bg-white border-[#E2E8F0] shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#1E293B] text-base">消耗趋势</CardTitle>
                <Tabs value={period} onValueChange={setPeriod}>
                  <TabsList className="bg-[#F1F5F9]">
                    <TabsTrigger value="daily" className="text-xs">日趋势</TabsTrigger>
                    <TabsTrigger value="weekly" className="text-xs">周趋势</TabsTrigger>
                    <TabsTrigger value="by-bot-type" className="text-xs">Bot分布</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              {period === 'by-bot-type' ? (
                botData.length === 0 ? (
                  <div className="text-center text-[#64748B] py-12">暂无数据</div>
                ) : (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={botData.map(b => ({ ...b, label: botLabel(b.bot_type) }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748B' }} />
                        <YAxis tick={{ fontSize: 12, fill: '#64748B' }} />
                        <Tooltip content={<CostTooltip />} />
                        <Legend />
                        <Bar dataKey="cost" name="费用(¥)" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )
              ) : chartData.length === 0 ? (
                <div className="text-center text-[#64748B] py-12">暂无数据 — 有新对话后自动采集</div>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748B' }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 12, fill: '#64748B' }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#64748B' }} />
                      <Tooltip content={<CostTooltip />} />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="费用" name="费用(¥)" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
                      <Line yAxisId="right" type="monotone" dataKey="Token" name="Token" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bot 分布明细 */}
          {period !== 'by-bot-type' && botData.length > 0 && (
            <Card className="bg-white border-[#E2E8F0] shadow-sm">
              <CardHeader>
                <CardTitle className="text-[#1E293B] text-base">各 Bot 消耗分布</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {botData.map((bot, i) => {
                    const maxCost = Math.max(...botData.map(b => Number(b.cost)), 0.0001);
                    const pct = (Number(bot.cost) / maxCost) * 100;
                    return (
                      <div key={bot.bot_type}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded" style={{ background: BOT_COLORS[i % BOT_COLORS.length] }} />
                            <span className="text-sm text-[#1E293B]">{botLabel(bot.bot_type)}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-[#64748B]">{formatTokens(Number(bot.prompt_tokens) + Number(bot.completion_tokens))} tokens</span>
                            <span className="font-semibold text-[#1E293B] w-16 text-right">{formatYuan(Number(bot.cost))}</span>
                          </div>
                        </div>
                        <div className="h-6 bg-[#F1F5F9] rounded overflow-hidden">
                          <div
                            className="h-full rounded transition-all duration-500"
                            style={{ width: `${pct}%`, background: BOT_COLORS[i % BOT_COLORS.length] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 明细表格 */}
          {detail.length > 0 && (
            <Card className="bg-white border-[#E2E8F0] shadow-sm">
              <CardHeader>
                <CardTitle className="text-[#1E293B] text-base">
                  {period === 'daily' ? '每日明细' : '每周明细'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E2E8F0]">
                        <th className="text-left py-2 px-3 text-[#64748B] font-medium">{period === 'daily' ? '日期' : '周'}</th>
                        <th className="text-right py-2 px-3 text-[#64748B] font-medium">输入Token</th>
                        <th className="text-right py-2 px-3 text-[#64748B] font-medium">输出Token</th>
                        <th className="text-right py-2 px-3 text-[#64748B] font-medium">总Token</th>
                        <th className="text-right py-2 px-3 text-[#64748B] font-medium">费用(¥)</th>
                        <th className="text-right py-2 px-3 text-[#64748B] font-medium">调用次数</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.map((row: any, i: number) => {
                        const label = row.date || row.week || '';
                        const promptT = Number(row.prompt_tokens) || 0;
                        const compT = Number(row.completion_tokens) || 0;
                        return (
                          <tr key={i} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC]">
                            <td className="py-2.5 px-3 text-[#1E293B]">{label}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-[#64748B]">{formatTokens(promptT)}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-[#64748B]">{formatTokens(compT)}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-[#1E293B] font-medium">{formatTokens(promptT + compT)}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-[#1E293B]">{formatYuan(Number(row.cost) || 0)}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-[#64748B]">{Number(row.calls) || 0}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 空状态 */}
          {!hasData && (
            <Card className="bg-white border-[#E2E8F0] shadow-sm">
              <CardContent className="py-12 text-center">
                <p className="text-[#64748B] text-base">暂无消耗数据</p>
                <p className="text-[#94A3B8] text-sm mt-1">有新对话后自动采集，可发送几条消息给AI来触发</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
