// 职途星组态引擎 · 单条路径卡片
'use client';

import React, { useState } from 'react';
import { RouteMatchResult } from '@/lib/career-paths/types';
import GapDetailModal from '@/components/career-paths/GapDetailModal';
import JobTypeList from '@/components/career-paths/JobTypeList';

interface RouteCardProps {
  result: RouteMatchResult;
  rank: number;
}

const verdictStyle: Record<string, { border: string; badge: string; tag: string }> = {
  strong_match: {
    border: 'border-green-200',
    badge: 'bg-green-100 text-green-700',
    tag: '🟢 强匹配',
  },
  match: {
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
    tag: '🔵 匹配',
  },
  partial_match: {
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-700',
    tag: '🟡 弱匹配',
  },
  no_match: {
    border: 'border-gray-200',
    badge: 'bg-gray-100 text-gray-500',
    tag: '⚪ 不匹配',
  },
};

export default function RouteCard({ result, rank }: RouteCardProps) {
  const [showGap, setShowGap] = useState(false);
  const [showJobs, setShowJobs] = useState(false);
  const style = verdictStyle[result.verdict];

  return (
    <>
      <div className={`rounded-xl border ${style.border} bg-white/90 backdrop-blur-sm shadow-sm overflow-hidden transition hover:shadow-md`}>
        {/* 头部 */}
        <div className="p-4 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <span className="text-lg font-bold text-gray-300 mt-0.5">#{rank}</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">{result.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.badge}`}>
                  {style.tag}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">{result.scenario}</p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-xl font-bold ${result.verdict === 'no_match' ? 'text-gray-400' : 'text-blue-600'}`}>
              {Math.round(result.match_rate * 100)}%
            </div>
            <div className="text-xs text-gray-400">匹配度</div>
          </div>
        </div>

        {/* 条件明细表 */}
        <div className="px-4 pb-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 border-b border-gray-100">
                <th className="text-left py-1.5 font-medium">条件</th>
                <th className="text-left py-1.5 font-medium">要求</th>
                <th className="text-left py-1.5 font-medium">你的</th>
                <th className="text-right py-1.5 font-medium">状态</th>
              </tr>
            </thead>
            <tbody>
              {result.field_details.map((fd) => (
                <tr key={fd.field} className="border-b border-gray-50">
                  <td className="py-1.5 text-gray-600">{fd.label}</td>
                  <td className="py-1.5 text-gray-500">{fd.required}</td>
                  <td className="py-1.5 text-gray-700 font-medium">{fd.current}</td>
                  <td className="py-1.5 text-right">
                    {fd.status === 'met' && <span className="text-green-500">✅</span>}
                    {fd.status === 'near_gap' && <span className="text-amber-500">⚠️ 差一点</span>}
                    {fd.status === 'gap' && <span className="text-red-400">❌</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 操作按钮 */}
        <div className="px-4 pb-4 flex gap-2">
          <button
            onClick={() => setShowJobs(!showJobs)}
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
          >
            {showJobs ? '收起岗位' : '查看典型岗位'}
          </button>
          {result.gaps.length > 0 && (
            <button
              onClick={() => setShowGap(true)}
              className="px-3 py-1.5 text-xs rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition"
            >
              查看差距建议 ({result.gaps.length})
            </button>
          )}
        </div>

        {/* 典型岗位（折叠） */}
        {showJobs && <JobTypeList jobs={result.job_types} />}
      </div>

      {/* 差距详情弹窗 */}
      {showGap && (
        <GapDetailModal
          routeName={result.name}
          matchRate={result.match_rate}
          gaps={result.gaps}
          onClose={() => setShowGap(false)}
        />
      )}
    </>
  );
}
