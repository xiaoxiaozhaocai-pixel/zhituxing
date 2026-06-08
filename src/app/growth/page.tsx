'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Clock, Globe, Sparkles, Target, TrendingUp, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface TimelineItem {
  id: number;
  type: 'career-plan' | 'competency' | 'assessment';
  typeLabel: string;
  icon: string;
  title: string;
  subtitle: string;
  created_at: string;
  link: string | null;
  linkLabel: string;
}

const typeStyles: Record<string, { bg: string; border: string; text: string }> = {
  'career-plan': { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  'competency': { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
  'assessment': { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin} 分钟前`;
  if (diffHour < 24) return `${diffHour} 小时前`;
  if (diffDay < 7) return `${diffDay} 天前`;

  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function GrowthPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth');
      return;
    }
    fetchTimeline();
  }, [user, authLoading]);

  const fetchTimeline = async () => {
    try {
      const res = await fetch('/api/growth/timeline', {
        headers: { 'x-user-id': user!.id },
      });
      const data = await res.json();
      if (data.success) setItems(data.data);
    } catch (e) {
      console.error('获取成长数据失败:', e);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || (loading && !items.length)) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f8fafd] via-white to-[#f0f5ff]/40 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#165DFF] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#94A3B8] text-sm">加载成长数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8fafd] via-white to-[#f0f5ff]/40">
      {/* Header */}
      <section className="relative overflow-hidden pt-12 pb-8">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#165DFF]/3 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#3D7FFF]/3 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4 pointer-events-none" />

        <div className="max-w-4xl mx-auto px-5 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#165DFF]/8 text-[#165DFF] text-sm font-medium mb-4">
              <TrendingUp className="w-4 h-4" />
              我的成长
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#1E293B] tracking-tight mb-3">
              成长记录
            </h1>
            <p className="text-[#64748B] text-base max-w-md mx-auto">
              职业规划、胜任力评估、能力测评 — 所有成长报告都在这里
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-10">
            {[
              { label: '职业规划', count: items.filter(i => i.type === 'career-plan').length, icon: '🎯', color: 'text-blue-600' },
              { label: '胜任力评估', count: items.filter(i => i.type === 'competency').length, icon: '📊', color: 'text-emerald-600' },
              { label: '能力测评', count: items.filter(i => i.type === 'assessment').length, icon: '📋', color: 'text-amber-600' },
            ].map(stat => (
              <div key={stat.label} className="bg-white rounded-2xl border border-[#E2E8F0] p-4 text-center hover:shadow-md hover:border-[#CBD5E1] transition-all duration-300">
                <div className="text-2xl mb-1">{stat.icon}</div>
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.count}</div>
                <div className="text-xs text-[#94A3B8] mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="pb-20">
        <div className="max-w-4xl mx-auto px-5 sm:px-6 lg:px-8">
          {items.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#F1F5F9] flex items-center justify-center">
                <Clock className="w-8 h-8 text-[#94A3B8]" />
              </div>
              <h3 className="text-lg font-semibold text-[#475569] mb-2">暂无成长记录</h3>
              <p className="text-[#94A3B8] text-sm mb-6">
                去小职对话中用职业规划、胜任力评估等功能，生成报告后就会出现在这里
              </p>
              <button
                onClick={() => router.push('/')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#165DFF] text-white font-medium text-sm hover:bg-[#1351E5] transition-colors shadow-md shadow-[#165DFF]/20"
              >
                <Sparkles className="w-4 h-4" />
                找小职聊聊
              </button>
            </div>
          ) : (
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-6 top-3 bottom-3 w-0.5 bg-[#E2E8F0]" />

              <div className="space-y-4">
                {items.map((item, idx) => {
                  const style = typeStyles[item.type];
                  return (
                    <div key={`${item.type}-${item.id}`} className="relative pl-14">
                      {/* Dot */}
                      <div className={`absolute left-[17px] top-6 w-3.5 h-3.5 rounded-full border-2 border-white ${style.bg} ring-2 ring-[#E2E8F0] z-10`} />

                      {/* Card */}
                      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 hover:shadow-md hover:border-[#CBD5E1] transition-all duration-300">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text} border ${style.border}`}>
                                {item.icon} {item.typeLabel}
                              </span>
                              <span className="text-xs text-[#94A3B8]">{formatDate(item.created_at)}</span>
                            </div>
                            <h3 className="text-base font-semibold text-[#1E293B] mb-1">{item.title}</h3>
                            {item.subtitle && (
                              <p className="text-sm text-[#64748B]">{item.subtitle}</p>
                            )}
                          </div>
                          {item.link && (
                            <button
                              onClick={() => router.push(item.link!)}
                              className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-[#165DFF] bg-[#165DFF]/6 hover:bg-[#165DFF]/10 transition-colors"
                            >
                              {item.linkLabel}
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
