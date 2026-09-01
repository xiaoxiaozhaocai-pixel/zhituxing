'use client';

import React from 'react';
import Link from 'next/link';
import { Star, ClipboardCheck, FileText, Sparkles, Target, BookOpen, Heart } from 'lucide-react';
import { GlassCard, SectionTitle, SkeletonLine, cn } from './shared';

export interface OverviewStats {
  fav: number;
  assess: number;
  report: number;
}

export interface OverviewLoading {
  fav: boolean;
  assess: boolean;
  report: boolean;
}

const statConfig = [
  { key: 'fav' as const, label: '收藏岗位', icon: Star, href: '/profile/favorites', color: 'text-[#FF7D00]' },
  { key: 'assess' as const, label: '测评记录', icon: ClipboardCheck, href: '/assessment', color: 'text-[#165DFF]' },
  { key: 'report' as const, label: '规划报告', icon: FileText, href: '/career-planning', color: 'text-[#00B42A]' },
];

const quickEntries = [
  { label: '去匹配岗位', desc: 'AI 智能推荐', icon: Target, href: '/match' },
  { label: '去做测评', desc: '了解自己的能力', icon: BookOpen, href: '/assessment' },
  { label: '去收藏', desc: '管理感兴趣的岗位', icon: Heart, href: '/profile/favorites' },
];

export function OverviewSidebar({
  stats,
  loading,
}: {
  stats: OverviewStats;
  loading: OverviewLoading;
}) {
  return (
    <div className="space-y-4">
      <GlassCard className="p-5" hover={false}>
        <SectionTitle icon={Sparkles} title="求职概览" />
        <div className="space-y-3">
          {statConfig.map(({ key, label, icon: Icon, href, color }) => (
            <Link key={key} href={href} className="block">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/50 border border-gray-50 transition-all hover:bg-white hover:border-[#165DFF]/20 hover:shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                    <Icon className={cn('w-5 h-5', color)} />
                  </div>
                  <span className="text-sm text-gray-600">{label}</span>
                </div>
                {loading[key] ? (
                  <SkeletonLine className="h-7 w-10" />
                ) : (
                  <span className="text-2xl font-bold text-gray-800 tabular-nums">
                    {stats[key]}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-5" hover={false}>
        <SectionTitle icon={Target} title="快捷入口" />
        <div className="space-y-2.5">
          {quickEntries.map(({ label, desc, icon: Icon, href }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-white/50 transition-all hover:border-[#165DFF]/30 hover:shadow-md hover:shadow-[#165DFF]/5 hover:-translate-y-0.5"
            >
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#165DFF] to-[#3D7FFF] flex items-center justify-center shadow-sm shadow-[#165DFF]/20">
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-700 group-hover:text-[#165DFF] transition-colors">
                  {label}
                </div>
                <div className="text-xs text-gray-400">{desc}</div>
              </div>
              <svg
                className="w-4 h-4 text-gray-300 group-hover:text-[#165DFF] group-hover:translate-x-0.5 transition-all"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
