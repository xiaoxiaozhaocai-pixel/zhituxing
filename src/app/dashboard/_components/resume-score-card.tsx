'use client';

import React from 'react';
import Link from 'next/link';
import { FileCheck2, ChevronRight, Target, Calendar } from 'lucide-react';
import { GlassCard, SectionTitle, SkeletonCard, EmptyState, formatDate, MatchScoreBar } from './shared';

export interface ResumeScoreRecord {
  id: string;
  target_job?: string | null;
  overall_score?: number | null;
  dimensions?: Array<{ name: string; score: number; comment?: string; weight?: number }>;
  created_at?: string;
}

function scoreTone(score: number | null | undefined): string {
  if (typeof score !== 'number') return 'text-gray-400';
  if (score >= 80) return 'text-[#00B42A]';
  if (score >= 60) return 'text-[#165DFF]';
  return 'text-[#FF7D00]';
}

export function ResumeScoreCard({
  record,
  loading,
  error,
}: {
  record: ResumeScoreRecord | null;
  loading: boolean;
  error: string | null;
}) {
  return (
    <GlassCard className="p-5" hover={false}>
      <SectionTitle
        icon={FileCheck2}
        title="简历评估"
        action={
          <Link
            href="/resume-optimize"
            className="flex items-center gap-0.5 text-xs text-[#165DFF] hover:underline"
          >
            更多
            <ChevronRight className="w-3 h-3" />
          </Link>
        }
      />

      {loading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} className="py-3" />
          ))}
        </div>
      ) : error ? (
        <EmptyState icon={FileCheck2} message={`加载失败：${error}`} />
      ) : !record ? (
        <EmptyState
          icon={FileCheck2}
          message="还没有简历评估记录，去优化一份简历获取评分吧"
          actionLabel="去评估"
          actionHref="/resume-optimize"
        />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Target className="w-4 h-4 text-[#165DFF] flex-shrink-0" />
              <span className="text-sm font-medium text-gray-700 truncate">
                {record.target_job || '未指定目标岗位'}
              </span>
            </div>
            <span className={`text-2xl font-bold tabular-nums ${scoreTone(record.overall_score)}`}>
              {typeof record.overall_score === 'number' ? Math.round(record.overall_score) : '--'}
            </span>
          </div>

          {record.created_at && (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Calendar className="w-3 h-3" />
              {formatDate(record.created_at)}
            </div>
          )}

          {record.dimensions && record.dimensions.length > 0 && (
            <div className="space-y-2 pt-1">
              {record.dimensions.slice(0, 4).map((dim, i) => (
                <div key={`${dim.name}-${i}`} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{dim.name}</span>
                    <span className="text-xs font-semibold text-gray-600 tabular-nums">
                      {typeof dim.score === 'number' ? Math.round(dim.score) : '--'}
                    </span>
                  </div>
                  <MatchScoreBar score={typeof dim.score === 'number' ? dim.score : 0} />
                </div>
              ))}
            </div>
          )}

          <Link
            href="/resume-optimize"
            className="mt-1 flex items-center justify-center gap-1 text-xs font-medium text-[#165DFF] hover:underline"
          >
            查看完整评分与建议
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </GlassCard>
  );
}
