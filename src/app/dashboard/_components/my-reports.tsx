'use client';

import React from 'react';
import Link from 'next/link';
import { FileText, ChevronRight, Calendar, Briefcase, MapPin } from 'lucide-react';
import { GlassCard, SectionTitle, SkeletonCard, EmptyState, formatDate } from './shared';

export interface DashboardReport {
  id: string;
  title?: string;
  major?: string;
  core_job?: string;
  city?: string;
  create_time?: string;
  created_at?: string;
  [key: string]: unknown;
}

function getReportTitle(rep: DashboardReport): string {
  return rep.title || rep.core_job || '职业规划报告';
}

function getReportDate(rep: DashboardReport): string {
  return formatDate(rep.create_time || rep.created_at);
}

export function MyReports({
  reports,
  loading,
  error,
}: {
  reports: DashboardReport[];
  loading: boolean;
  error: string | null;
}) {
  return (
    <GlassCard className="p-5" hover={false}>
      <SectionTitle
        icon={FileText}
        title="我的报告"
        action={
          <Link
            href="/career-planning"
            className="flex items-center gap-0.5 text-xs text-[#165DFF] hover:underline"
          >
            更多
            <ChevronRight className="w-3 h-3" />
          </Link>
        }
      />

      {loading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 2 }).map((_, i) => (
            <SkeletonCard key={i} className="py-3" />
          ))}
        </div>
      ) : error ? (
        <EmptyState icon={FileText} message={`加载失败：${error}`} />
      ) : reports.length === 0 ? (
        <EmptyState
          icon={FileText}
          message="还没有职业规划报告，去生成一份专属规划吧"
          actionLabel="去生成"
          actionHref="/career-planning"
        />
      ) : (
        <div className="space-y-2">
          {reports.slice(0, 3).map((rep) => (
            <Link
              key={rep.id}
              href={`/career-planning/report/${rep.id}`}
              className="group block p-3 rounded-lg border border-gray-100 bg-white/50 transition-all hover:border-[#165DFF]/20 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="text-sm font-medium text-gray-700 group-hover:text-[#165DFF] transition-colors line-clamp-1">
                  {getReportTitle(rep)}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#165DFF] flex-shrink-0 mt-0.5" />
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                {rep.major && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-3 h-3" />
                    {rep.major}
                  </span>
                )}
                {rep.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {rep.city}
                  </span>
                )}
                {getReportDate(rep) && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {getReportDate(rep)}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
