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
  const { user, loading } = useAuth();
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
// eslint-disable-next-line
      fetchDetail();
    }
// eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div className="min-h-screen bg-gradient-to-b from-[#f8fafd] via-white to-[#f0f5ff]/40">
      {/* Hero 评分区 */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0a3d8f] via-[#165DFF] to-[#4d8aff] text-white">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#5b9aff] rounded-full blur-[100px] opacity-25 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[250px] h-[250px] bg-[#3D7FFF] rounded-full blur-[80px] opacity-20 pointer-events-none" />
        
        <div className="relative max-w-5xl mx-auto px-6 py-12">
          <button
            onClick={() => router.push('/resume-optimize')}
            className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回优化
          </button>

          <div className="flex flex-col md:flex-row md:items-center gap-10">
            {/* 评分圆环 */}
            <div className="relative w-32 h-32 shrink-0">
              <div className="absolute inset-0 rounded-full bg-white/10 blur-xl" />
              <svg className="relative w-full h-full -rotate-90" viewBox="0 0 140 140">
                <defs>
                  <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#60e06e" />
                    <stop offset="50%" stopColor="#FFD700" />
                    <stop offset="100%" stopColor="#FF7D00" />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                <circle cx="70" cy="70" r="60" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="8" />
                <circle
                  cx="70" cy="70" r="60" fill="none" stroke="url(#scoreGradient)"
                  strokeWidth="8" strokeLinecap="round" filter="url(#glow)"
                  strokeDasharray={`${score / 100 * 377} 377`}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black leading-none tracking-tight">{score}</span>
                <span className="text-xs text-white/50 mt-0.5">综合评分</span>
              </div>
            </div>

            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold mb-2 tracking-tight">{detail.target_position}</h1>
              <p className="text-white/60 text-sm mb-5">
                优化时间：{new Date(detail.created_at).toLocaleString('zh-CN')}
              </p>
              <div className="flex flex-wrap items-center gap-4">
                {[
                  { count: highlightCount, label: '亮点', color: 'bg-green-400' },
                  { count: improvementCount, label: '待改进', color: 'bg-orange-400' },
                  { count: suggestionCount, label: '建议', color: 'bg-blue-300' },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm">
                    <span className={`w-2 h-2 rounded-full ${stat.color}`} />
                    <span className="text-sm font-medium">{stat.count}</span>
                    <span className="text-sm text-white/60">{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 50" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 50V25C240 0 480 0 720 25C960 50 1200 50 1440 25V50H0Z" fill="#f8fafd" />
          </svg>
        </div>
      </section>

      {/* 对比区 */}
      <section className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 原始简历 */}
          <Card className="shadow-md border-0 overflow-hidden">
            <div className="h-1 bg-gray-300" />
            <CardHeader className="pb-3 pt-5">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-[#666]">
                <FileText className="w-4 h-4" />
                原始简历
              </CardTitle>
              <CardDescription className="text-xs">你提交的原始内容</CardDescription>
            </CardHeader>
            <CardContent className="pb-5">
              <div className="bg-gray-50 rounded-xl p-5 text-sm leading-relaxed whitespace-pre-wrap text-[#555] max-h-[500px] overflow-y-auto font-mono text-xs border border-gray-100">
                {detail.original_content}
              </div>
            </CardContent>
          </Card>

          {/* 优化后简历 */}
          <Card className="shadow-lg border-0 overflow-hidden ring-1 ring-[#165DFF]/10">
            <div className="h-1 bg-gradient-to-r from-[#165DFF] to-[#4d8aff]" />
            <CardHeader className="pb-3 pt-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-[#165DFF]">
                  <Sparkles className="w-4 h-4" />
                  优化后简历
                </CardTitle>
                <Button variant="outline" size="sm" onClick={handleCopy} className="h-8 text-xs rounded-lg border-gray-200 hover:border-[#165DFF]/30 hover:text-[#165DFF]">
                  {copied ? (
                    <><CheckCircle className="w-3.5 h-3.5 mr-1 text-green-500" /> 已复制</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5 mr-1" /> 复制</>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pb-5">
              {isMember ? (
                <div className="bg-gradient-to-br from-[#165DFF]/3 to-blue-50/50 rounded-xl p-5 text-sm leading-relaxed whitespace-pre-wrap text-[#333] max-h-[500px] overflow-y-auto border border-[#165DFF]/5">
                  {detail.optimized_content}
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden">
                  <div className="bg-gradient-to-br from-[#165DFF]/3 to-blue-50/50 rounded-xl p-5 text-sm leading-relaxed whitespace-pre-wrap blur-[3px] select-none max-h-[500px] overflow-hidden">
                    {detail.optimized_content}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[2px] rounded-xl">
                    <div className="text-center p-8 bg-white/90 rounded-2xl shadow-xl border border-gray-100">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF7D00]/10 to-[#FFB800]/10 flex items-center justify-center mx-auto mb-3">
                        <Crown className="w-6 h-6 text-[#FF7D00]" />
                      </div>
                      <p className="font-bold text-[#1a1a1a] mb-1">开通会员查看完整内容</p>
                      <p className="text-xs text-[#999] mb-5">解锁 AI 优化后的完整简历</p>
                      <Button
                        className="bg-gradient-to-r from-[#FF7D00] to-[#FF9A00] hover:from-[#FF7D00] hover:to-[#FF7D00] text-white font-semibold rounded-xl shadow-lg shadow-[#FF7D00]/20"
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
      <section className="max-w-5xl mx-auto px-6 pb-10">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#165DFF]/10 to-[#3D7FFF]/10 flex items-center justify-center">
            <PenTool className="w-4 h-4 text-[#165DFF]" />
          </div>
          <h2 className="text-lg font-bold text-[#1a1a1a]">
            优化建议
            <span className="text-sm font-normal text-[#aaa] ml-2">共 {detail.suggestions.length} 条</span>
          </h2>
        </div>
        <div className="space-y-3">
          {detail.suggestions.map((item, idx) => {
            const config = item.type === 'highlight'
              ? { icon: TrendingUp, badge: '✨ 亮点', bg: 'bg-white hover:bg-green-50/50', border: 'border-l-green-400', badgeBg: 'bg-green-50 text-green-600' }
              : item.type === 'improvement'
              ? { icon: AlertCircle, badge: '🔧 待改进', bg: 'bg-white hover:bg-orange-50/50', border: 'border-l-orange-400', badgeBg: 'bg-orange-50 text-orange-600' }
              : { icon: Zap, badge: '💡 建议', bg: 'bg-white hover:bg-blue-50/50', border: 'border-l-blue-400', badgeBg: 'bg-blue-50 text-blue-600' };

            return (
              <Card key={idx} className={`shadow-sm border-0 border-l-[3px] ${config.border} ${config.bg} transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${config.badgeBg}`}>
                      <config.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={`${config.badgeBg} border-0 text-xs font-medium`}>
                          {config.badge}
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
      <section className="max-w-5xl mx-auto px-6 pb-14">
        <div className="flex flex-wrap gap-3 pt-5 border-t border-gray-100">
          <Button
            variant="outline"
            className="border-gray-200 text-[#666] hover:border-[#165DFF]/30 hover:text-[#165DFF] rounded-xl transition-all"
            onClick={() => router.push('/resume-optimize')}
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            继续优化其他简历
          </Button>
          <Link href="/resume-builder">
            <Button className="bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] hover:from-[#165DFF] hover:to-[#165DFF] text-white font-semibold rounded-xl shadow-md shadow-[#165DFF]/20">
              <PenTool className="w-3.5 h-3.5 mr-1.5" />
              去编辑简历
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
