// 职途星组态引擎 · 差距详情弹窗
'use client';

import React from 'react';
import { GapItem } from '@/lib/career-paths/types';

interface GapDetailModalProps {
  routeName: string;
  matchRate: number;
  gaps: GapItem[];
  onClose: () => void;
}

export default function GapDetailModal({ routeName, matchRate, gaps, onClose }: GapDetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-base">差距分析</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
          </div>
          <p className="text-sm text-gray-500 mt-1">{routeName}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-gray-500">匹配度：</span>
            <span className={`text-lg font-bold ${matchRate >= 1 ? 'text-green-600' : matchRate >= 0.5 ? 'text-amber-600' : 'text-red-500'}`}>
              {Math.round(matchRate * 100)}%
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
              当前：{matchRate >= 1 ? '已满足' : matchRate >= 0.5 ? '接近' : '差距较大'}
            </span>
          </div>
        </div>

        {/* 差距列表 */}
        <div className="p-5 space-y-4">
          {gaps.length === 0 ? (
            <div className="text-center py-6 text-green-600">
              <div className="text-2xl mb-2">🎉</div>
              <p className="font-medium">全部条件已满足！</p>
              <p className="text-sm text-gray-500 mt-1">你没有需要提升的地方</p>
            </div>
          ) : (
            gaps.map((gap, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-lg mt-0.5">
                    {gap.field === 'MAJ_CAT' ? '📚' : gap.field === 'INT_NUM' || gap.field === 'INT_QLT' ? '💼' : '🛠️'}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800 text-sm">{gap.label}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-600">不满足</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      要求：<span className="text-gray-700">{gap.required}</span>
                      &nbsp;·&nbsp;你的：<span className="text-gray-700">{gap.current}</span>
                    </div>
                    <div className="mt-2 bg-blue-50 rounded-lg p-2.5 text-xs text-blue-800">
                      <span className="font-medium">💡 提升建议：</span>
                      {gap.advice}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 底部 */}
        <div className="p-4 border-t border-gray-100 text-center">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
