'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CostSummary {
  totalCost: number;
  totalChats: number;
  totalTokens: number;
  dailyAvg: number;
  monthlyProjection: number;
  costChange: number | null;
  warning: string;
  avgTokensPerChat: number;
}

interface DailyCostItem {
  date: string;
  chats: number;
  interviews: number;
  courses: number;
  estTokens: number;
  estCost: number;
}

interface CostData {
  summary: CostSummary;
  daily: DailyCostItem[];
  constants: {
    dsPricePer1MTokens: number;
    avgTokensPerChat: number;
    avgTokensPerInterview: number;
    avgTokensPerCourse: number;
  };
  period: string;
}

/* ─── SVG 成本趋势图 ─── */
function CostTrendChart({ data }: { data: DailyCostItem[] }) {
  if (data.length === 0) return <div className="text-center text-[#64748B] py-8">暂无数据</div>;

  const w = 700, h = 260, px = 55, py = 25;
  const chartW = w - px - 20, chartH = h - py * 2;

  let maxCost = 0.1;
  for (const d of data) {
    if (d.estCost > maxCost) maxCost = d.estCost;
    if (d.chats > maxCost) maxCost = d.chats * 0.001;
  }
  maxCost = Math.ceil(maxCost * 1.2 * 100) / 100;

  const xStep = data.length > 1 ? chartW / (data.length - 1) : chartW;
  const toX = (i: number) => px + i * xStep;
  const toY = (v: number) => py + chartH - (v / maxCost) * chartH;

  const labelInterval = Math.max(1, Math.floor(data.length / 12));

  const _costPoints = data.map((d, i) => `${toX(i)},${toY(d.estCost)}`);
  const chatPoints = data.map((d, i) => `${toX(i)},${toY(d.chats * 0.001)}`); // 缩放到大致同量级

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
        {/* Y轴 */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const y = toY(pct * maxCost);
          return (
            <g key={i}>
              <line x1={px} y1={y} x2={w - 20} y2={y} stroke="#E2E8F0" strokeWidth={0.5} />
              <text x={px - 6} y={y + 4} textAnchor="end" fill="#94A3B8" fontSize={10}>
                ¥{Math.round(pct * maxCost * 100) / 100}
              </text>
            </g>
          );
        })}
        {/* X轴 */}
        {data.map((d, i) =>
          i % labelInterval === 0 ? (
            <text key={d.date} x={toX(i)} y={h - 4} textAnchor="middle" fill="#94A3B8" fontSize={9}>
              {d.date.slice(5)}
            </text>
          ) : null
        )}
        {/* 对话数折线（辅助线，色淡） */}
        <polyline
          points={chatPoints.join(' ')}
          fill="none"
          stroke="#94A3B8"
          strokeWidth={1}
          strokeDasharray="4,3"
          strokeLinejoin="round"
        />
        {/* 成本柱状图 */}
        {data.map((d, i) => {
          const barW = Math.max(3, xStep * 0.6);
          const barH = (d.estCost / maxCost) * chartH;
          return (
            <rect
              key={d.date}
              x={toX(i) - barW / 2}
              y={toY(d.estCost)}
              width={barW}
              height={barH}
              fill={d.estCost > 1 ? '#EF4444' : d.estCost > 0.5 ? '#F97316' : '#3B82F6'}
              rx={1}
              opacity={0.85}
            />
          );
        })}
        {/* 数据标签 */}
        {data.filter(d => d.estCost > 0.05).map((d, i) => (
          <text
            key={`lbl-${d.date}`}
            x={toX(i)}
            y={toY(d.estCost) - 4}
            textAnchor="middle"
            fill="#1E293B"
            fontSize={8}
            fontWeight={600}
          >
            ¥{d.estCost.toFixed(2)}
          </text>
        ))}
      </svg>
      {/* 图例 */}
      <div className="flex items-center gap-6 mt-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-blue-500" />
          <span className="text-[#64748B]">成本（¥）</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-0 border-t border-dashed border-[#94A3B8]" />
          <span className="text-[#64748B]">对话数（参考）</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-red-500" />
          <span className="text-[#64748B]">高消耗（&gt;¥1/天）</span>
        </div>
      </div>
    </div>
  );
}

/* ─── 主页面 ─── */
export default function AdminCostsPage() {
  const [data, setData] = useState<CostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
// eslint-disable-next-line
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/costs?days=${days}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (err) {
      console.error('加载成本数据失败:', err);
    } finally {
      setLoading(false);
    }
  }

  const summary = data?.summary;
  const daily = data?.daily || [];
  const warningLabel = summary?.warning === 'high' ? '⚠️ 高消耗' : summary?.warning === 'medium' ? '⚡ 注意' : '✅ 正常';
  const warningColor = summary?.warning === 'high' ? 'text-red-600 bg-red-50 border-red-200'
    : summary?.warning === 'medium' ? 'text-orange-600 bg-orange-50 border-orange-200'
    : 'text-green-600 bg-green-50 border-green-200';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">成本监控看板</h1>
          <p className="text-[#64748B] text-sm mt-1">DeepSeek API 消耗估算与趋势追踪</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="bg-white border-[#E2E8F0] shadow-sm">
              <CardContent className="p-5">
                <p className="text-sm text-[#64748B]">总消耗（近{days}天）</p>
                <p className="text-2xl font-bold text-[#1E293B] mt-1">
                  ¥{summary?.totalCost?.toFixed(2) ?? '0.00'}
                </p>
                <p className="text-xs text-[#94A3B8] mt-1">DeepSeek API</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-[#E2E8F0] shadow-sm">
              <CardContent className="p-5">
                <p className="text-sm text-[#64748B]">日均消耗</p>
                <p className="text-2xl font-bold text-[#1E293B] mt-1">
                  ¥{summary?.dailyAvg?.toFixed(3) ?? '0.000'}
                </p>
                <p className="text-xs text-[#94A3B8] mt-1">/天</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-[#E2E8F0] shadow-sm">
              <CardContent className="p-5">
                <p className="text-sm text-[#64748B]">月预估</p>
                <p className={`text-2xl font-bold mt-1 ${
                  (summary?.monthlyProjection ?? 0) > 600 ? 'text-red-600' : 'text-[#1E293B]'
                }`}>
                  ¥{summary?.monthlyProjection?.toFixed(2) ?? '0.00'}
                </p>
                <p className="text-xs text-[#94A3B8] mt-1">按当前日均推算</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-[#E2E8F0] shadow-sm">
              <CardContent className="p-5">
                <p className="text-sm text-[#64748B]">总对话数</p>
                <p className="text-2xl font-bold text-[#1E293B] mt-1">
                  {summary?.totalChats ?? 0}
                </p>
                <p className="text-xs text-[#94A3B8] mt-1">近{days}天</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-[#E2E8F0] shadow-sm">
              <CardContent className="p-5">
                <p className="text-sm text-[#64748B]">状态</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2.5 py-1 rounded-md text-sm font-medium border ${warningColor}`}>
                    {warningLabel}
                  </span>
                </div>
                <p className="text-xs text-[#94A3B8] mt-2">
                  {summary?.costChange !== null
                    ? `较前日 ${(summary?.costChange ?? 0) > 0 ? '+' : ''}${summary?.costChange}%`
                    : '—'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 成本明细 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 趋势图 */}
            <Card className="bg-white border-[#E2E8F0] shadow-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-[#1E293B] text-base">每日成本趋势</CardTitle>
              </CardHeader>
              <CardContent>
                <CostTrendChart data={daily} />
              </CardContent>
            </Card>

            {/* 估算参数 */}
            <Card className="bg-white border-[#E2E8F0] shadow-sm">
              <CardHeader>
                <CardTitle className="text-[#1E293B] text-base">估算参数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-[#94A3B8]">DS API 单价</p>
                    <p className="text-sm font-semibold text-[#1E293B]">
                      ¥{data?.constants?.dsPricePer1MTokens}/百万token
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#94A3B8]">平均每次对话</p>
                    <p className="text-sm font-semibold text-[#1E293B]">
                      {summary?.avgTokensPerChat?.toLocaleString() ?? data?.constants?.avgTokensPerChat} tokens
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#94A3B8]">总 token 消耗</p>
                    <p className="text-sm font-semibold text-[#1E293B]">
                      {(summary?.totalTokens ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#94A3B8]">成本阈值参考</p>
                    <div className="mt-1.5 space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-[#64748B]">&lt;¥10/天 正常</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500" />
                        <span className="text-[#64748B]">¥10-20/天 关注</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-[#64748B]">&gt;¥20/天 告警</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 逐日明细表 */}
          <Card className="bg-white border-[#E2E8F0] shadow-sm">
            <CardHeader>
              <CardTitle className="text-[#1E293B] text-base">逐日成本明细</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] text-left">
                      <th className="py-2 text-[#64748B] font-medium">日期</th>
                      <th className="py-2 text-[#64748B] font-medium text-right">对话</th>
                      <th className="py-2 text-[#64748B] font-medium text-right">面试</th>
                      <th className="py-2 text-[#64748B] font-medium text-right">课程</th>
                      <th className="py-2 text-[#64748B] font-medium text-right">Token</th>
                      <th className="py-2 text-[#64748B] font-medium text-right">成本</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daily.map((d) => (
                      <tr key={d.date} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC]">
                        <td className="py-2 text-[#1E293B]">{d.date}</td>
                        <td className="py-2 text-right text-[#1E293B]">{d.chats}</td>
                        <td className="py-2 text-right text-[#1E293B]">{d.interviews}</td>
                        <td className="py-2 text-right text-[#1E293B]">{d.courses}</td>
                        <td className="py-2 text-right text-[#64748B] font-mono text-xs">{d.estTokens.toLocaleString()}</td>
                        <td className="py-2 text-right font-semibold" style={{
                          color: d.estCost > 1 ? '#EF4444' : d.estCost > 0.5 ? '#F97316' : '#1E293B'
                        }}>¥{d.estCost.toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
