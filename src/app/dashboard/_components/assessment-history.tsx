'use client';

import React from 'react';
import Link from 'next/link';
import { ClipboardCheck, ChevronRight, Calendar } from 'lucide-react';
import { GlassCard, SectionTitle, SkeletonCard, EmptyState, formatDate, cn } from './shared';

export interface AssessmentRecord {
  id: string;
  created_at?: string;
  assessment_type?: string;
  type?: string;
  score?: number;
  total_score?: number;
  personality_type?: string;
  duration?: number;
  [key: string]: unknown;
}

function getAssessmentLabel(rec: AssessmentRecord): string {
  return (
    rec.assessment_type ||
    rec.type ||
    (rec.personality_type ? `${rec.personality_type} 测评` : '') ||
    '能力测评'
  );
}

function getAssessmentScore(rec: AssessmentRecord): number | null {
  if (typeof rec.score === 'number') return rec.score;
  if (typeof rec.total_score === 'number') return rec.total_score;
  return null;
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-[#00B42A]';
  if (score >= 60) return 'text-[#165DFF]';
  return 'text-[#FF7D00]';
}

export function AssessmentHistory({
  assessments,
  loading,
  error,
}: {
  assessments: AssessmentRecord[];
  loading: boolean;
  error: string | null;
}) {
  return (
    <GlassCard className="p-5" hover={false}>
      <SectionTitle
        icon={ClipboardCheck}
        title="测评历史"
        action={
          <Link
            href="/assessment"
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
        <EmptyState icon={ClipboardCheck} message={`加载失败：${error}`} />
      ) : assessments.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          message="还没有测评记录，去完成一次 AI 测评吧"
          actionLabel="去做测评"
          actionHref="/assessment"
        />
      ) : (
        <div className="space-y-1">
          {assessments.slice(0, 5).map((rec) => {
            const score = getAssessmentScore(rec);
            return (
              <Link
                key={rec.id}
                href="/growth"
                className="group flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#165DFF]/5 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-[#165DFF]/10 flex items-center justify-center flex-shrink-0">
                  <ClipboardCheck className="w-4 h-4 text-[#165DFF]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-700 group-hover:text-[#165DFF] transition-colors truncate">
                    {getAssessmentLabel(rec)}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                    <Calendar className="w-3 h-3" />
                    {formatDate(rec.created_at)}
                  </div>
                </div>
                {score != null && (
                  <span className={cn('text-sm font-bold tabular-nums', scoreColor(score))}>
                    {Math.round(score)}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#165DFF] transition-colors" />
              </Link>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}
