// 职途星组态引擎 · 匹配统计概览
'use client';

import React from 'react';
import { MatchSummary } from '@/lib/career-paths/types';

interface MatchStatsProps {
  summary: MatchSummary;
}

const verdictConfig = {
  strong_match: { label: '强匹配', color: 'bg-green-50 text-green-700 border-green-200', icon: '🟢' },
  match: { label: '匹配', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: '🔵' },
  partial_match: { label: '弱匹配', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: '🟡' },
  no_match: { label: '不匹配', color: 'bg-gray-50 text-slate-500 border-slate-200', icon: '⚪' },
};

export default function MatchStats({ summary }: MatchStatsProps) {
  const items: { key: keyof typeof verdictConfig; count: number }[] = [
    { key: 'strong_match', count: summary.strong_match },
    { key: 'match', count: summary.match },
    { key: 'partial_match', count: summary.partial_match },
    { key: 'no_match', count: summary.no_match },
  ];

  return (
    <div className="flex gap-3">
      {items.map(({ key, count }) => {
        const cfg = verdictConfig[key];
        return (
          <div
            key={key}
            className={`flex-1 rounded-xl border p-3 text-center ${cfg.color}`}
          >
            <div className="text-lg">{cfg.icon}</div>
            <div className="text-lg font-bold mt-0.5">{count}</div>
            <div className="text-xs mt-0.5">{cfg.label}</div>
          </div>
        );
      })}
    </div>
  );
}

/** 最佳路径高亮条 */
export function BestRouteBadge({ routeName, matchRate }: { routeName: string; matchRate: number }) {
  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
      <span className="text-lg">🏆</span>
      <div>
        <span className="text-xs text-amber-600 font-medium">最佳路径</span>
        <div className="text-sm font-semibold text-amber-800">
          {routeName} <span className="text-amber-500">★ {Math.round(matchRate * 100)}%</span>
        </div>
      </div>
    </div>
  );
}
