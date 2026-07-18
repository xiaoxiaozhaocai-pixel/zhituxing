'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, TrendingUp, Calendar, Target } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ResumeRadar } from '@/components/resume/ResumeRadar';

interface InterviewFeedback {
  id: number;
  target_job: string;
  overall_score: number;
  key_strengths: string[];
  key_weaknesses: string[];
  result_data?: {
    communication?: number;
    logic?: number;
    professionalism?: number;
    overall_match?: number;
    summary?: string;
    strengths?: string[];
    weaknesses?: string[];
    suggestions?: { area: string; advice: string; priority: string }[];
    star_analysis?: { good_examples: string[]; improvement_examples: string[] };
  };
  created_at: string;
}

export default function InterviewResultsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [feedbacks, setFeedbacks] = useState<InterviewFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState<InterviewFeedback | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  const fetchFeedbacks = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/interview/feedback');
      const data = await res.json();
      if (data.code === 200) {
        setFeedbacks(data.data.feedbacks || []);
      }
    } catch (err) {
      console.error('Failed to fetch feedbacks:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchFeedbacks();
    }
  }, [user, fetchFeedbacks]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-blue-600 bg-blue-50';
    if (score >= 40) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  const getScoreLevel = (score: number) => {
    if (score >= 80) return '优秀';
    if (score >= 60) return '良好';
    if (score >= 40) return '待提升';
    return '薄弱';
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#165DFF]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/profile">
            <Button variant="ghost" size="sm" className="text-gray-500">
              <ArrowLeft className="w-4 h-4 mr-1" />
              返回
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">模拟面试记录</h1>
            <p className="text-sm text-gray-500 mt-1">查看你的面试表现和进步趋势</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#165DFF]" />
          </div>
        ) : feedbacks.length === 0 ? (
          <Card className="text-center py-20">
            <CardContent>
              <div className="text-6xl mb-4">🎤</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">还没有面试记录</h3>
              <p className="text-gray-500 mb-6">去小职那里做一次模拟面试，完成后会自动生成报告</p>
              <Link href="/assistant?bot=interview">
                <Button className="bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] text-white">
                  开始模拟面试
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* 总体趋势 */}
            {feedbacks.length >= 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#165DFF]" />
                    面试表现趋势
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    {feedbacks.slice(0, 3).reverse().map((fb, idx) => (
                      <div key={fb.id} className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-500 mb-1">第{idx + 1}次</div>
                        <div className="text-lg font-bold text-[#165DFF]">{fb.overall_score || '-'}</div>
                        <div className="text-xs text-gray-400">{formatDate(fb.created_at)}</div>
                      </div>
                    ))}
                  </div>
                  {feedbacks.length >= 2 && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                      最近 {feedbacks.length} 次面试记录，继续练习稳定提升～
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 面试记录列表 */}
            <div className="space-y-3">
              {feedbacks.map((fb) => {
                const rd = fb.result_data || {};
                const hasRadarData = rd.communication !== undefined;
                const dimensions = hasRadarData
                  ? [
                      { name: '沟通力', score: (rd.communication || 0) / 10 },
                      { name: '逻辑力', score: (rd.logic || 0) / 10 },
                      { name: '专业度', score: (rd.professionalism || 0) / 10 },
                      { name: '综合匹配', score: (rd.overall_match || fb.overall_score || 0) / 10 },
                    ]
                  : [
                      { name: '综合表现', score: Math.min((fb.overall_score || 0) / 10, 10) },
                      { name: '简历匹配', score: 5 },
                      { name: '面试表现', score: 5 },
                    ];

                return (
                  <Card
                    key={fb.id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedFeedback(selectedFeedback?.id === fb.id ? null : fb)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* 雷达图缩略 */}
                        <div className="w-32 h-32 flex-shrink-0 hidden sm:block">
                          <ResumeRadar data={dimensions} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Target className="w-4 h-4 text-[#165DFF]" />
                            <span className="font-medium text-gray-900 truncate">
                              {fb.target_job || '未指定岗位'}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getScoreColor(fb.overall_score || 0)}`}>
                              {getScoreLevel(fb.overall_score || 0)} · {fb.overall_score || '-'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(fb.created_at)}</span>
                          </div>

                          {rd.summary && (
                            <p className="text-sm text-gray-600 line-clamp-2">{rd.summary}</p>
                          )}

                          {/* 维度评分微条 */}
                          {hasRadarData && (
                            <div className="flex gap-3 mt-2">
                              {[
                                { label: '沟通', score: rd.communication },
                                { label: '逻辑', score: rd.logic },
                                { label: '专业', score: rd.professionalism },
                              ].map((d) => (
                                <div key={d.label} className="flex items-center gap-1 text-xs">
                                  <span className="text-gray-400">{d.label}</span>
                                  <span className="font-medium text-gray-700">{d.score}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* 展开后的详情 */}
                          {selectedFeedback?.id === fb.id && (
                            <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                              {rd.strengths && rd.strengths.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium text-green-700 mb-2">✅ 亮点</h4>
                                  <ul className="text-sm text-gray-600 space-y-1">
                                    {rd.strengths.map((s, i) => (
                                      <li key={i} className="flex items-start gap-2">
                                        <span className="text-green-500 mt-0.5">•</span>
                                        {s}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {rd.weaknesses && rd.weaknesses.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium text-amber-700 mb-2">🔧 待改进</h4>
                                  <ul className="text-sm text-gray-600 space-y-1">
                                    {rd.weaknesses.map((w, i) => (
                                      <li key={i} className="flex items-start gap-2">
                                        <span className="text-amber-500 mt-0.5">•</span>
                                        {w}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {rd.suggestions && rd.suggestions.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium text-blue-700 mb-2">📈 提升建议</h4>
                                  <div className="space-y-2">
                                    {rd.suggestions.map((sg, i) => (
                                      <div key={i} className="text-sm bg-blue-50 rounded-lg p-3">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="font-medium text-blue-800">{sg.area}</span>
                                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                                            sg.priority === 'high' ? 'bg-red-100 text-red-600' :
                                            sg.priority === 'medium' ? 'bg-amber-100 text-amber-600' :
                                            'bg-blue-100 text-blue-600'
                                          }`}>{sg.priority === 'high' ? '高优先' : sg.priority === 'medium' ? '中优先' : '低优先'}</span>
                                        </div>
                                        <p className="text-gray-600">{sg.advice}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <Link href="/assistant?bot=interview">
                                <Button size="sm" className="bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] text-white">
                                  再来一次
                                </Button>
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
