'use client';

import React from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

export function cn(...inputs: (string | undefined | false | null)[]): string {
  return inputs.filter(Boolean).join(' ');
}

export async function fetchJson<T>(url: string): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(url);
    if (res.status === 401) return { data: null, error: '未登录' };
    if (!res.ok) return { data: null, error: `请求失败 (${res.status})` };
    const json = await res.json();
    if (json.success === false) return { data: null, error: json.error || '请求失败' };
    return { data: (json.data ?? null) as T | null, error: null };
  } catch (err) {
    console.error(`[fetchJson] ${url}:`, err);
    return { data: null, error: '网络错误，请稍后重试' };
  }
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function GlassCard({
  children,
  className,
  hover = true,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={cn(
        'bg-white/70 backdrop-blur-xl border border-gray-100/80 rounded-xl shadow-sm',
        hover &&
          'transition-all duration-300 hover:shadow-lg hover:shadow-[#165DFF]/5 hover:border-[#165DFF]/20 hover:-translate-y-0.5',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  icon: Icon,
  title,
  action,
}: {
  icon: LucideIcon;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-[#165DFF]/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-[#165DFF]" />
        </div>
        <h2 className="text-base font-semibold text-gray-800">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function SkeletonLine({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-gray-200/70', className)} />;
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('p-4 rounded-xl border border-gray-100 bg-white/40 space-y-3', className)}>
      <SkeletonLine className="h-4 w-2/3" />
      <SkeletonLine className="h-3 w-1/2" />
      <SkeletonLine className="h-3 w-1/3" />
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  message,
  actionLabel,
  actionHref,
}: {
  icon: LucideIcon;
  message: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="w-14 h-14 rounded-full bg-[#165DFF]/5 flex items-center justify-center mb-3">
        <Icon className="w-7 h-7 text-[#165DFF]/30" />
      </div>
      <p className="text-sm text-gray-400 mb-3 max-w-[220px] leading-relaxed">{message}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="text-sm font-medium text-[#165DFF] hover:underline transition-colors"
        >
          {actionLabel} →
        </Link>
      )}
    </div>
  );
}

export function MatchScoreBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, Math.round(score)));
  const gradient =
    pct >= 80
      ? 'from-[#165DFF] to-[#3D7FFF]'
      : pct >= 60
        ? 'from-[#3D7FFF] to-[#5B9FFF]'
        : 'from-[#7BB3FF] to-[#9EC8FF]';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full bg-gradient-to-r rounded-full transition-all duration-700', gradient)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-bold text-[#165DFF] tabular-nums min-w-[36px] text-right">
        {pct}%
      </span>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-3">
        <svg className="w-7 h-7 text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <p className="text-sm text-gray-400 max-w-[200px]">{message}</p>
    </div>
  );
}
