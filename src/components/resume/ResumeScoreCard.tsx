'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface Dimension {
  name: string;
  score: number;
  comment: string;
  weight: number;
}

interface ResumeScoreCardProps {
  data: {
    overall_score: number;
    dimensions: Dimension[];
    improvements: string[];
  };
  className?: string;
}

/** 星级评价 */
function getStarRating(score: number): { stars: string; label: string } {
  if (score >= 9) return { stars: '⭐⭐⭐⭐⭐', label: '卓越' };
  if (score >= 7) return { stars: '⭐⭐⭐⭐', label: '优秀' };
  if (score >= 5) return { stars: '⭐⭐⭐', label: '一般' };
  return { stars: '⭐⭐', label: '需提升' };
}

/** 进度条颜色渐变类名 */
function getProgressColor(score: number): string {
  if (score >= 8) return 'bg-gradient-to-r from-green-400 to-green-500';
  if (score >= 6) return 'bg-gradient-to-r from-[#165DFF] to-[#3D7FFF]';
  return 'bg-gradient-to-r from-amber-400 to-red-400';
}

/** 改进建议优先级图标 */
function getImprovementIcon(index: number): string {
  if (index < 3) return '🔴';
  if (index < 6) return '🟡';
  return '⚪';
}

function DimensionScoreBar({ dimension }: { dimension: Dimension }) {
  const [expanded, setExpanded] = useState(false);
  const displayScore = Math.round(dimension.score * 10) / 10;

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between group cursor-pointer text-left"
      >
        <span className="text-sm font-medium text-gray-700 truncate flex items-center gap-1.5">
          {dimension.name}
          <svg
            className={cn(
              'w-3.5 h-3.5 text-gray-400 transition-transform duration-200',
              expanded && 'rotate-180'
            )}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
        <span className={cn(
          'text-sm font-semibold tabular-nums',
          dimension.score >= 8 ? 'text-green-600' :
          dimension.score >= 6 ? 'text-[#165DFF]' :
          'text-amber-600'
        )}>
          {displayScore}
        </span>
      </button>

      <Progress
        value={dimension.score * 10}
        className="h-2 bg-gray-100 rounded-full"
        indicatorClassName={cn('rounded-full', getProgressColor(dimension.score))}
      />

      {/* 展开评语 */}
      {expanded && dimension.comment && (
        <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 mt-1 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
          {dimension.comment}
        </div>
      )}
    </div>
  );
}

export default function ResumeScoreCard({ data, className }: ResumeScoreCardProps) {
  const { overall_score, dimensions, improvements } = data;
  const { stars, label } = getStarRating(overall_score);
  const displayTotal = Math.round(overall_score * 10) / 10;

  return (
    <Card className={cn(
      'bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-[#165DFF]/5 border-0 overflow-hidden',
      className
    )}>
      {/* 顶部彩色装饰条 */}
      <div className="h-1.5 bg-gradient-to-r from-[#165DFF] via-[#3D7FFF] to-blue-300" />

      <CardContent className="p-6 space-y-6">
        {/* ===== 总分区 ===== */}
        <div className="bg-white/70 backdrop-blur rounded-2xl border border-[#165DFF]/20 p-5">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* 大号分数 */}
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-bold text-gray-900 tabular-nums">
                {displayTotal}
              </span>
              <span className="text-base text-gray-400 font-medium">/ 10</span>
            </div>

            {/* 分隔线（PC） */}
            <div className="hidden sm:block w-px h-12 bg-gray-200" />

            {/* 星级 + 标签 */}
            <div className="flex flex-col items-center sm:items-start">
              <span className="text-2xl tracking-wider">{stars}</span>
              <span className={cn(
                'mt-0.5 text-sm font-medium px-2.5 py-0.5 rounded-full',
                overall_score >= 9 ? 'bg-green-50 text-green-700' :
                overall_score >= 7 ? 'bg-blue-50 text-[#165DFF]' :
                overall_score >= 5 ? 'bg-amber-50 text-amber-700' :
                'bg-red-50 text-red-600'
              )}>
                {label}
              </span>
            </div>

            {/* 右侧填充 */}
            <div className="hidden sm:block flex-1" />

            {/* 维度数信息 */}
            <div className="text-xs text-gray-400 text-center sm:text-right">
              <div>{dimensions.length} 个评估维度</div>
              <div>{improvements.length} 条改进建议</div>
            </div>
          </div>
        </div>

        {/* ===== 维度评分条区 ===== */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <svg className="w-4 h-4 text-[#165DFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            维度评分
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {dimensions.map((dim, idx) => (
              <DimensionScoreBar key={idx} dimension={dim} />
            ))}
          </div>
        </div>

        {/* ===== 分隔线 ===== */}
        <div className="border-t border-gray-100" />

        {/* ===== 改进建议区 ===== */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <svg className="w-4 h-4 text-[#165DFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            改进建议
          </h3>

          <ol className="space-y-2">
            {improvements.map((item, idx) => (
              <li
                key={idx}
                className={cn(
                  'flex items-start gap-3 text-sm rounded-lg p-3 transition-colors',
                  idx < 3 ? 'bg-red-50/60' :
                  idx < 6 ? 'bg-amber-50/60' :
                  'bg-gray-50/60'
                )}
              >
                <span className="text-base leading-5 flex-shrink-0 mt-0.5">
                  {getImprovementIcon(idx)}
                </span>
                <span className="text-gray-700 leading-relaxed">{item}</span>
              </li>
            ))}
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
