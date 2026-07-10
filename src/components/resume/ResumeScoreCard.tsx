'use client';

import React from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, TrendingUp, AlertCircle } from 'lucide-react';

interface Dimension {
  name: string;
  score: number;
  maxScore: number;
  weight: number;
  comment: string;
}

interface ScoreResult {
  overallScore: number;
  summary: string;
  dimensions: Dimension[];
  improvements: string[];
  radarData: Record<string, number>;
}

interface Props {
  result: ScoreResult;
  targetJob?: string;
}

const RADAR_COLORS = {
  grid: '#E5E7EB',
  fill: '#165DFF',
  stroke: '#165DFF',
  text: '#6B7280',
};

const BAR_COLORS = [
  '#165DFF', // primary blue
  '#3D7FFF',
  '#36B37E', // green
  '#FF7D00', // membership gold
  '#8B5CF6', // purple
  '#F59E0B', // amber
];

function getScoreLevel(score: number): { label: string; color: string; bg: string } {
  if (score >= 8.5) return { label: '优秀', color: 'text-green-600', bg: 'bg-green-50' };
  if (score >= 7) return { label: '良好', color: 'text-blue-600', bg: 'bg-blue-50' };
  if (score >= 5) return { label: '一般', color: 'text-orange-600', bg: 'bg-orange-50' };
  return { label: '待提升', color: 'text-red-600', bg: 'bg-red-50' };
}

function RadarChartCard({ radarData }: { radarData: Record<string, number> }) {
  const chartData = Object.entries(radarData).map(([name, score]) => ({
    dimension: name,
    score,
    fullMark: 10,
  }));

  if (chartData.length === 0) return null;

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke={RADAR_COLORS.grid} />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fill: RADAR_COLORS.text, fontSize: 12 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 10]}
            tick={{ fill: RADAR_COLORS.text, fontSize: 10 }}
            tickCount={6}
          />
          <Radar
            name="评分"
            dataKey="score"
            stroke={RADAR_COLORS.stroke}
            fill={RADAR_COLORS.fill}
            fillOpacity={0.15}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function DimensionBarChart({ dimensions }: { dimensions: Dimension[] }) {
  const chartData = dimensions
    .filter(d => d.name !== '综合竞争力')
    .map(d => ({ name: d.name, score: d.score }));

  return (
    <div className="w-full h-48 mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 30, left: 70, bottom: 0 }}
        >
          <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11 }}
            width={65}
          />
          <Tooltip
            formatter={(value: number) => [`${value}/10`, '评分']}
            contentStyle={{ fontSize: 12 }}
          />
          <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={18}>
            {chartData.map((_, idx) => (
              <Cell key={idx} fill={BAR_COLORS[idx % BAR_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function ResumeScoreCard({ result, targetJob }: Props) {
  const level = getScoreLevel(result.overallScore / 10);

  return (
    <Card className="border border-blue-100 shadow-sm">
      <CardHeader className="pb-3 border-b border-blue-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#165DFF]" />
            <CardTitle className="text-lg">简历综合评分</CardTitle>
          </div>
          {targetJob && (
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
              {targetJob}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {/* 总分 */}
        <div className="flex items-center justify-center mb-4">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center ${level.bg} border-2 border-[#165DFF]/20`}>
            <div className="text-center">
              <div className={`text-3xl font-bold ${level.color}`}>
                {result.overallScore}
              </div>
              <div className="text-[10px] text-gray-400">/100</div>
            </div>
          </div>
          <div className="ml-4 flex-1">
            <div className={`text-sm font-medium ${level.color}`}>{level.label}</div>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              {result.summary}
            </p>
          </div>
        </div>

        {/* 雷达图 */}
        <RadarChartCard radarData={result.radarData} />

        {/* 维度柱状图 */}
        <DimensionBarChart dimensions={result.dimensions} />

        {/* 维度详情 */}
        <div className="mt-4 space-y-2">
          {result.dimensions
            .filter(d => d.name !== '综合竞争力')
            .map((dim, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-gray-50/80">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700">{dim.name}</span>
                  <span className="text-xs font-bold" style={{ color: BAR_COLORS[idx % BAR_COLORS.length] }}>
                    {dim.score}/10
                  </span>
                </div>
                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(dim.score / 10) * 100}%`,
                      backgroundColor: BAR_COLORS[idx % BAR_COLORS.length],
                    }}
                  />
                </div>
                {dim.comment && (
                  <p className="text-[11px] text-gray-400 mt-1">{dim.comment}</p>
                )}
              </div>
            ))}
        </div>

        {/* 改进建议 */}
        {result.improvements && result.improvements.length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-amber-50/80 border border-amber-100">
            <div className="flex items-center gap-1.5 mb-2">
              <Lightbulb className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-medium text-amber-700">改进建议</span>
            </div>
            <ul className="space-y-1">
              {result.improvements.map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <AlertCircle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                  <span className="text-xs text-amber-800">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
