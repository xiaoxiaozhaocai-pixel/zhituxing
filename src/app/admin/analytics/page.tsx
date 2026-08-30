'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/* ─── 类型 ─── */
interface DashboardMetrics {
  dau: number;
  chatCount: number;
  assessmentCompleteRate: number;
  paywallConvertRate: number;
}
interface DistributionItem {
  event_type: string;
  count: number;
}
interface FunnelStage {
  name: string;
  count: number;
}
interface TrendItem {
  date: string;
  event_type: string;
  count: number;
}
interface TopPageItem {
  page: string;
  views: number;
}
interface DashboardData {
  metrics: DashboardMetrics;
  distribution: DistributionItem[];
  funnel: { stages: FunnelStage[] };
  trend: TrendItem[];
  topPages: TopPageItem[];
  period: string;
}

/* ─── 颜色配置 ─── */
const EVENT_COLORS: Record<string, string> = {
  page_view: '#3B82F6',
  chat_send: '#8B5CF6',
  match_view: '#F97316',
  assessment_start: '#06B6D4',
  assessment_complete: '#10B981',
  learning_path_view: '#6366F1',
  skill_graph_explore: '#EC4899',
  paywall_show: '#EAB308',
  paywall_convert: '#22C55E',
  interview_start: '#F43F5E',
  interview_complete: '#14B8A6',
};
const DEFAULT_COLOR = '#94A3B8';

const EVENT_LABELS: Record<string, string> = {
  page_view: '页面浏览',
  chat_send: '发送对话',
  match_view: '查看匹配',
  assessment_start: '开始测评',
  assessment_complete: '完成测评',
  learning_path_view: '学习路径',
  skill_graph_explore: '技能图谱',
  paywall_show: '付费墙展示',
  paywall_convert: '付费转化',
  interview_start: '开始面试',
  interview_complete: '完成面试',
};

/* ─── SVG 饼图 ─── */
function PieChart({ data }: { data: DistributionItem[] }) {
  const total = data.reduce((s, d) => s + Number(d.count), 0);
  if (total === 0) return <div className="text-center text-[#64748B] py-8">暂无数据</div>;

  const cx = 120, cy = 120, r = 90;
  let cumAngle = -90;
  const slices = data.map((d) => {
    const pct = Number(d.count) / total;
    const angle = pct * 360;
    const startAngle = cumAngle;
// eslint-disable-next-line react-hooks/immutability
    cumAngle += angle;
    const endAngle = cumAngle;
    const largeArc = angle > 180 ? 1 : 0;
    const x1 = cx + r * Math.cos((startAngle * Math.PI) / 180);
    const y1 = cy + r * Math.sin((startAngle * Math.PI) / 180);
    const x2 = cx + r * Math.cos((endAngle * Math.PI) / 180);
    const y2 = cy + r * Math.sin((endAngle * Math.PI) / 180);
    const path = `M${cx},${cy} L${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 ${largeArc},1 ${x2.toFixed(1)},${y2.toFixed(1)} Z`;
    return {
      path,
      color: EVENT_COLORS[d.event_type] || DEFAULT_COLOR,
      label: EVENT_LABELS[d.event_type] || d.event_type,
      pct: (pct * 100).toFixed(1),
      count: Number(d.count),
    };
  });

  return (
    <div className="flex items-center gap-6">
      <svg width={240} height={240} viewBox="0 0 240 240">
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth={2} />
        ))}
      </svg>
      <div className="flex-1 space-y-1.5 max-h-[240px] overflow-y-auto">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: s.color }} />
            <span className="text-[#1E293B] flex-1 truncate">{s.label}</span>
            <span className="text-[#64748B]">{s.count}</span>
            <span className="text-[#94A3B8] w-12 text-right">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── SVG 漏斗图 ─── */
function FunnelChart({ stages }: { stages: FunnelStage[] }) {
  if (stages.length === 0) return <div className="text-center text-[#64748B] py-8">暂无数据</div>;
  const maxCount = Math.max(...stages.map((s) => s.count), 1);
  const colors = ['#3B82F6', '#8B5CF6', '#F97316', '#22C55E'];

  return (
    <div className="space-y-3">
      {stages.map((stage, i) => {
        const widthPct = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
        const convRate = i > 0 && stages[i - 1]!.count > 0
          ? ((stage.count / stages[i - 1]!.count) * 100).toFixed(1)
          : null;
        return (
          <div key={i}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-[#1E293B]">{stage.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[#1E293B]">{stage.count}</span>
                {convRate && (
                  <span className="text-xs text-[#64748B]">转化率 {convRate}%</span>
                )}
              </div>
            </div>
            <div className="h-8 bg-[#F1F5F9] rounded relative overflow-hidden">
              <div
                className="h-full rounded transition-all duration-500"
                style={{ width: `${widthPct}%`, background: colors[i] || DEFAULT_COLOR }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── SVG 多折线趋势图 ─── */
function TrendChart({ data, days }: { data: TrendItem[]; days: number }) {
  if (data.length === 0) return <div className="text-center text-[#64748B] py-8">暂无数据</div>;

  const dateMap = new Map<string, string>();
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dateMap.set(key, `${d.getMonth() + 1}/${d.getDate()}`);
  }
  const dates = Array.from(dateMap.keys());

  const eventTypes = [...new Set(data.map((d) => d.event_type))];
  const eventMap = new Map<string, Map<string, number>>();
  for (const d of data) {
    if (!eventMap.has(d.event_type)) eventMap.set(d.event_type, new Map());
    const m = eventMap.get(d.event_type)!;
    m.set(String(d.date).slice(0, 10), Number(d.count));
  }

  const topEvents = eventTypes
    .map((et) => ({
      et,
      total: Array.from(eventMap.get(et)?.values() || []).reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map((e) => e.et);

  const w = 700, h = 280, px = 50, py = 20;
  const chartW = w - px - 20, chartH = h - py * 2;

  let maxVal = 1;
  for (const et of topEvents) {
    for (const date of dates) {
      const v = eventMap.get(et)?.get(date) || 0;
      if (v > maxVal) maxVal = v;
    }
  }
  maxVal = Math.ceil(maxVal * 1.2);

  const xStep = dates.length > 1 ? chartW / (dates.length - 1) : chartW;
  const toX = (i: number) => px + i * xStep;
  const toY = (v: number) => py + chartH - (v / maxVal) * chartH;

  const labelInterval = Math.max(1, Math.floor(dates.length / 10));

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
        {/* Y轴刻度 */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const y = toY(pct * maxVal);
          return (
            <g key={i}>
              <line x1={px} y1={y} x2={w - 20} y2={y} stroke="#E2E8F0" strokeWidth={0.5} />
              <text x={px - 6} y={y + 4} textAnchor="end" fill="#94A3B8" fontSize={10}>
                {Math.round(pct * maxVal)}
              </text>
            </g>
          );
        })}
        {/* X轴标签 */}
        {dates.map((d, i) =>
          i % labelInterval === 0 ? (
            <text key={d} x={toX(i)} y={h - 2} textAnchor="middle" fill="#94A3B8" fontSize={9}>
              {dateMap.get(d)}
            </text>
          ) : null
        )}
        {/* 折线 */}
        {topEvents.map((et) => {
          const points = dates.map((d, i) => {
            const v = eventMap.get(et)?.get(d) || 0;
            return `${toX(i)},${toY(v)}`;
          });
          const color = EVENT_COLORS[et] || DEFAULT_COLOR;
          return (
            <g key={et}>
              <polyline
                points={points.join(' ')}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinejoin="round"
              />
              {dates.map((d, i) => {
                const v = eventMap.get(et)?.get(d) || 0;
                return v > 0 ? (
                  <circle key={d} cx={toX(i)} cy={toY(v)} r={2.5} fill={color} />
                ) : null;
              })}
            </g>
          );
        })}
      </svg>
      {/* 图例 */}
      <div className="flex flex-wrap gap-4 mt-3">
        {topEvents.map((et) => (
          <div key={et} className="flex items-center gap-1.5 text-xs">
            <span className="w-3 h-0.5 rounded" style={{ background: EVENT_COLORS[et] || DEFAULT_COLOR }} />
            <span className="text-[#64748B]">{EVENT_LABELS[et] || et}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── 主页面 ─── */
export default function AdminAnalyticsPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
// eslint-disable-next-line react-hooks/immutability
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  async function loadDashboard() {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?action=dashboard&days=${days}`, {
        headers: { 'x-user-id': '999' },
      });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error('加载仪表盘失败:', err);
    } finally {
      setLoading(false);
    }
  }

  const metrics = data?.metrics;
  const distribution = data?.distribution || [];
  const funnel = data?.funnel?.stages || [];
  const trend = data?.trend || [];
  const topPages = data?.topPages || [];

  return (
    <div className="space-y-6">
      {/* 页面标题 + 时间范围 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">行为数据看板</h1>
          <p className="text-[#64748B] text-sm mt-1">用户行为分析与数据洞察</p>
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

      {loading && !data ? (
        <div className="text-center text-[#64748B] py-20">加载中...</div>
      ) : (
        <>
          {/* 核心指标卡片 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="DAU（日活）"
              value={metrics?.dau ?? 0}
              subtitle="当日活跃用户"
              icon="👥"
              color="text-blue-600"
            />
            <MetricCard
              title="对话次数"
              value={metrics?.chatCount ?? 0}
              subtitle={`${days}天内总对话`}
              icon="💬"
              color="text-purple-600"
            />
            <MetricCard
              title="测评完成率"
              value={`${metrics?.assessmentCompleteRate ?? 0}%`}
              subtitle="完成/开始测评"
              icon="📊"
              color="text-cyan-600"
            />
            <MetricCard
              title="付费转化率"
              value={`${metrics?.paywallConvertRate ?? 0}%`}
              subtitle="转化/展示付费墙"
              icon="💎"
              color="text-green-600"
            />
          </div>

          {/* 中间行：事件分布 + 漏斗 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white border-[#E2E8F0] shadow-sm">
              <CardHeader>
                <CardTitle className="text-[#1E293B] text-base">行为事件分布</CardTitle>
              </CardHeader>
              <CardContent>
                <PieChart data={distribution} />
              </CardContent>
            </Card>

            <Card className="bg-white border-[#E2E8F0] shadow-sm">
              <CardHeader>
                <CardTitle className="text-[#1E293B] text-base">用户行为漏斗</CardTitle>
              </CardHeader>
              <CardContent>
                <FunnelChart stages={funnel} />
              </CardContent>
            </Card>
          </div>

          {/* 趋势图 */}
          <Card className="bg-white border-[#E2E8F0] shadow-sm">
            <CardHeader>
              <CardTitle className="text-[#1E293B] text-base">行为趋势（近{days}天）</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart data={trend} days={days} />
            </CardContent>
          </Card>

          {/* 热门页面 */}
          <Card className="bg-white border-[#E2E8F0] shadow-sm">
            <CardHeader>
              <CardTitle className="text-[#1E293B] text-base">热门页面排行 Top 10</CardTitle>
            </CardHeader>
            <CardContent>
              {topPages.length === 0 ? (
                <div className="text-center text-[#64748B] py-6">暂无页面浏览数据</div>
              ) : (
                <div className="space-y-2">
                  {topPages.map((item, i) => {
                    const maxViews = Number(topPages[0]?.views) || 1;
                    const barPct = (Number(item.views) / maxViews) * 100;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-6 text-center text-sm text-[#94A3B8] font-mono">
                          {i + 1}
                        </span>
                        <span className="text-sm text-[#1E293B] w-32 truncate">
                          {String(item.page)}
                        </span>
                        <div className="flex-1 h-6 bg-[#F1F5F9] rounded overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded"
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                        <span className="text-sm text-[#64748B] w-16 text-right">
                          {Number(item.views)}次
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

/* ─── 指标卡片组件 ─── */
function MetricCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: number | string;
  subtitle: string;
  icon: string;
  color: string;
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
