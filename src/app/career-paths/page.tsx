// 职途星组态引擎 · 主页面
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { RawProfile, EncodedProfile, MatchReport } from '@/lib/career-paths/types';
import { encodeProfile } from '@/lib/career-paths/engine/condition_encoder';
import { getMatchReport } from '@/lib/career-paths/engine/rule_engine';
import ProfileForm from '@/components/career-paths/ProfileForm';
import MatchStats, { BestRouteBadge } from '@/components/career-paths/MatchStats';
import RouteCard from '@/components/career-paths/RouteCard';

export default function CareerPathsPage() {
  const [report, setReport] = useState<MatchReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [majorFromUrl, setMajorFromUrl] = useState('');

  // 支持从认知校正跳转带入专业（/career-paths?major=xxx）
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const m = new URLSearchParams(window.location.search).get('major');
      if (m) setMajorFromUrl(m);
    }
  }, []);

  const handleSubmit = useCallback((raw: RawProfile) => {
    setLoading(true);
    setError(null);

    try {
      // 模拟一个微小的延迟让用户有反馈感
      setTimeout(() => {
        try {
          const encoded: EncodedProfile = encodeProfile(raw);
          const result = getMatchReport(encoded);
          setReport(result);
          setLoading(false);
        } catch {
          setError('匹配计算失败，请检查输入信息');
          setLoading(false);
        }
      }, 300);
    } catch {
      setError('输入信息有误，请重试');
      setLoading(false);
    }
  }, []);

  const handleReset = () => {
    setReport(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f5ff]/40 via-white to-[#f8fafd]">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            🎯 求职方向匹配
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            填一下你的基本信息，看看桂电学生最常见的 8 条求职路径中，你最适合哪条
          </p>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            {error}
          </div>
        )}

        {/* 表单 / 结果切换 */}
        {!report ? (
          <ProfileForm onSubmit={handleSubmit} loading={loading} initialMajor={majorFromUrl} />
        ) : (
          <div className="space-y-4">
            {/* 重新开始 */}
            <button
              onClick={handleReset}
              className="text-sm text-blue-500 hover:text-blue-700 transition flex items-center gap-1"
            >
              ← 重新输入
            </button>

            {/* 概览区 */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-blue-100 shadow-sm p-4">
              <p className="text-xs text-gray-400 mb-2">🔍 你的求职方向匹配报告</p>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-gray-600">
                  学校：{report.profile.SCH_TIER < 0.5 ? '二本/其他' : report.profile.SCH_TIER < 0.75 ? '一本' : report.profile.SCH_TIER < 0.95 ? '211' : '985'}
                </span>
                <span className="text-gray-300">·</span>
                <span className="text-sm text-gray-600">专业分类：{report.profile.MAJ_CAT}</span>
              </div>
              <MatchStats summary={report.summary} />
            </div>

            {/* 最佳路径 */}
            {report.summary.best_route && (
              <BestRouteBadge
                routeName={report.routes[0]?.name || ''}
                matchRate={report.summary.best_match_rate}
              />
            )}

            {/* 路径卡片列表 */}
            <div className="space-y-3">
              {report.routes.map((route, i) => (
                <div key={route.route_id} className="relative">
                  {/* 多条强匹配时，第一条标为最推荐 */}
                  {i === 0 && report.summary.strong_match >= 2 && (
                    <div className="absolute -top-2.5 left-4 z-10">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] text-white shadow-md">
                        ⭐ 最推荐
                      </span>
                    </div>
                  )}
                  <RouteCard result={route} rank={i + 1} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
