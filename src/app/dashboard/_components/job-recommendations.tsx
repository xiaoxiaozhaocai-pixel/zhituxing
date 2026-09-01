'use client';

import React from 'react';
import Link from 'next/link';
import {
  Briefcase,
  MapPin,
  Banknote,
  Sparkles,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';
import type { MatchGetItem } from '@/lib/api-contracts/match';
import {
  GlassCard,
  SectionTitle,
  SkeletonCard,
  EmptyState,
  MatchScoreBar,
  cn,
} from './shared';

function formatSalary(min?: number, max?: number, range?: string): string {
  if (range) return range;
  if (min != null && max != null && min > 0) {
    return `${(min / 1000).toFixed(0)}k-${(max / 1000).toFixed(0)}k`;
  }
  return '面议';
}

function JobCard({ item, rank }: { item: MatchGetItem; rank: number }) {
  const { job, matchScore, matchedSkills, gapSkills, salary } = item;
  const salaryText = formatSalary(
    salary?.estimatedMin ?? job?.salaryMin,
    salary?.estimatedMax ?? job?.salaryMax,
    job?.salaryRange,
  );
  const isHighMatch = matchScore >= 80;

  return (
    <GlassCard className="p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <div
            className={cn(
              'flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold',
              rank === 1
                ? 'bg-gradient-to-br from-[#FF7D00] to-[#FFB200] text-white'
                : 'bg-[#165DFF]/10 text-[#165DFF]',
            )}
          >
            {rank}
          </div>
          <div className="min-w-0 flex-1">
            <Link
              href={`/jobs/${job?.id ?? ''}`}
              className="text-sm font-semibold text-gray-800 hover:text-[#165DFF] transition-colors line-clamp-1"
            >
              {job?.jobName || '未知岗位'}
            </Link>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
              {job?.industry && (
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3 h-3" />
                  {job.industry}
                </span>
              )}
              {job?.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {job.city}
                </span>
              )}
            </div>
          </div>
        </div>
        {isHighMatch && (
          <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#FF7D00]/10 text-[#FF7D00]">
            <TrendingUp className="w-3 h-3" />
            强烈推荐
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 mb-3">
        <span className="flex items-center gap-1 text-sm font-medium text-[#165DFF]">
          <Banknote className="w-3.5 h-3.5" />
          {salaryText}
        </span>
      </div>

      <div className="mb-3">
        <MatchScoreBar score={matchScore} />
      </div>

      {matchedSkills && matchedSkills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {matchedSkills.slice(0, 5).map((skill, i) => (
            <span
              key={i}
              className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[#165DFF]/10 text-[#165DFF]"
            >
              {skill}
            </span>
          ))}
          {gapSkills && gapSkills.length > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-400">
              +{gapSkills.length} 项待提升
            </span>
          )}
        </div>
      )}
    </GlassCard>
  );
}

export function JobRecommendations({
  matches,
  loading,
  error,
}: {
  matches: MatchGetItem[];
  loading: boolean;
  error: string | null;
}) {
  return (
    <GlassCard className="p-5 h-full" hover={false}>
      <SectionTitle
        icon={Sparkles}
        title="岗位推荐 Top 5"
        action={
          <Link
            href="/match"
            className="flex items-center gap-0.5 text-xs text-[#165DFF] hover:underline"
          >
            查看全部
            <ChevronRight className="w-3 h-3" />
          </Link>
        }
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={Briefcase}
          message={`加载推荐失败：${error}`}
          actionLabel="重新匹配"
          actionHref="/match"
        />
      ) : matches.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          message="还没有匹配推荐，完善技能画像后来看看为你推荐的岗位吧"
          actionLabel="去匹配"
          actionHref="/match"
        />
      ) : (
        <div className="space-y-3">
          {matches.slice(0, 5).map((item, i) => (
            <JobCard key={item.job?.id ?? i} item={item} rank={i + 1} />
          ))}
        </div>
      )}
    </GlassCard>
  );
}
