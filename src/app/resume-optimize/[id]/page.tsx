'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Copy, CheckCircle, Crown, FileText, Sparkles, PenTool, TrendingUp, AlertCircle, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMembership } from '@/contexts/MembershipContext';

interface OptimizationDetail {
  id: string;
  target_position: string;
  original_content: string;
  optimized_content: string;
  suggestions: Array<{ type: string; title: string; suggestion: string }>;
  status: string;
  created_at: string;
}

export default function ResumeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading, quota } = useAuth();
  const { isMember } = useMembership();
  const [detail, setDetail] = useState<OptimizationDetail | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && params.id) {
      fetchDetail();
    }
  }, [user, params.id]);

  const fetchDetail = async () => {
    if (!user || !params.id) return;
    
    setDataLoading(true);
    try {
      const response = await fetch(`/api/resume/${params.id}`, {
        headers: { 'x-user-id': user.id }
      });
      const data = await response.json();
      
      if (data.success) {
        setDetail(data.data);
      }
    } catch (error) {
      console.error('获取详情失败:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const handleCopy = () => {
    if (detail?.optimized_content) {
      navigator.clipboard.writeText(detail.optimized_content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#165DFF]" />
      </div>
    );
  }

  if (!user || !detail) {
    return null;
  }

  const highlightCount = detail.suggestions.filter(s => s.type === 'highlight').length;
  const improvementCount = detail.suggestions.filter(s => s.type === 'improvement').length;
  const suggestionCount = detail.suggestions.filter(s => s.type === 'suggestion').length;
  const score = Math.min(100, Math.round(highlightCount * 15 + suggestionCount * 8 + 40));

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50/30">
      {/* Hero 评分区 */}
      <section className="bg-gradient-to-br from-[#165DFF] via-[#165DFF] to-[#3D7FFF] text-white">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <button
            onClick={() => router.push('/resume-optimize')}
            className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回优化
          </button>
          <div className="flex flex-col md:flex-row md:items-center gap-8">
            {/* 评分圆环 */}
            <div className="relative w-28 h-28 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
                <circle
                  cx="60" cy="60" r="52" fill="none" stroke="white"
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${score / 100 * 327} 327`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold leading-none">{score}</span>
                <span className="text-xs text-white/70 mt-1">分</span>
              </div>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">{detail.target_position}</h1>
              <p className="text-white/70 text-sm">
                优化时间：{new Date(detail.created_at).toLocaleString('zh-CN')}
              </p>
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  亮点 {highlightCount}
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
                  待改进 {improvementCount}
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-300" />
                  建议 {suggestionCount}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 对比区 */}
      <section className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 原始简历 */}
          <Card className="shadow-sm border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#999]" />
                原始简历
              </CardTitle>
              <CardDescription>你提交的简历内容</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap text-[#555] max-h-[500px] overflow-y-auto font-mono text-xs">
                {detail.original_content}
              </div>
            </CardContent>
          </Card>

          {/* 优化后简历 */}
          <Card className="shadow-sm border-0 ring-1 ring-[#165DFF]/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#165DFF]" />
                  优化后简历
                </CardTitle>
                <Button variant="outline" size="sm" onClick={handleCopy} className="h-8 text-xs">
                  {copied ? (
                    <><CheckCircle className="w-3.5 h-3.5 mr-1 text-green-500" /> 已复制</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5 mr-1" /> 复制</>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isMember ? (
                <div className="bg-gradient-to-br from-[#165DFF]/5 to-blue-50/50 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap text-[#333] max-h-[500px] overflow-y-auto">
                  {detail.optimized_content}
                </div>
              ) : (
                <div className="relative">
                  <div className="bg-gradient-to-br from-[#165DFF]/5 to-blue-50/50 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap blur-sm select-none max-h-[500px] overflow-hidden">
                    {detail.optimized_content}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-lg">
                    <div className="text-center p-6">
                      <Crown className="w-10 h-10 text-[#FF7D00] mx-auto mb-3" />
                      <p className="font-semibold text-[#1a1a1a] mb-1">开通会员查看完整内容</p>
                      <p className="text-xs text-[#999] mb-4">解锁优化后的完整简历</p>
                      <Button
                        className="bg-[#FF7D00] hover:bg-[#FF7D00]/90 text-white text-sm"
                        onClick={() => router.push('/pricing')}
                      >
                        <Crown className="w-3.5 h-3.5 mr-1.5" />
                        立即升级
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 优化建议 */}
      <section className="max-w-5xl mx-auto px-6 pb-8">
        <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4 flex items-center gap-2">
          <PenTool className="w-5 h-5 text-[#165DFF]" />
          优化建议
          <span className="text-sm font-normal text-[#999] ml-2">共 {detail.suggestions.length} 条</span>
        </h2>
        <div className="space-y-3">
          {detail.suggestions.map((item, idx) => {
            const typeConfig = item.type === 'highlight'
              ? { bg: 'bg-green-50 border-green-200', badge: 'bg-green-100 text-green-700', icon: TrendingUp, label: '亮点' }
              : item.type === 'improvement'
              ? { bg: 'bg-orange-50 border-orange-200', badge: 'bg-orange-100 text-orange-700', icon: AlertCircle, label: '待改进' }
              : { bg: 'bg-blue-50 border-blue-200', badge: 'bg-blue-100 text-blue-700', icon: Zap, label: '建议' };

            return (
              <Card key={idx} className={`shadow-sm border ${typeConfig.bg} border-l-4`}
                style={{ borderLeftColor: item.type === 'highlight' ? '#22c55e' : item.type === 'improvement' ? '#f97316' : '#165DFF' }}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${typeConfig.badge}`}>
                      <typeConfig.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={`${typeConfig.badge} border-0 text-xs font-medium`}>
                          {typeConfig.label}
                        </Badge>
                        <h3 className="font-semibold text-sm text-[#1a1a1a]">{item.title}</h3>
                      </div>
                      <p className="text-sm text-[#555] leading-relaxed">{item.suggestion}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* 底部操作 */}
      <section className="max-w-5xl mx-auto px-6 pb-12">
        <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
          <Button
            variant="outline"
            className="border-[#165DFF]/30 text-[#165DFF] hover:bg-[#165DFF]/5"
            onClick={() => router.push('/resume-optimize')}
          >
            继续优化其他简历
          </Button>
          <Link href="/resume-edit">
            <Button className="bg-[#165DFF] hover:bg-[#165DFF]/90">
              编辑简历
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
