'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, Sparkles, Crown, CheckCircle, ArrowRight, Clock, Plus, Zap, TrendingUp, Eye, PenTool, MessageSquare } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMembership } from '@/contexts/MembershipContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const positions = [
  'Java开发工程师',
  '前端开发工程师',
  '后端开发工程师',
  'Python开发工程师',
  '算法工程师',
  '产品经理',
  'UI设计师',
  '数据分析师',
  '运营专员',
  '市场专员',
  'HR',
  '行政专员',
  '财务专员',
  '管培生',
  '其他'
];

interface OptimizationRecord {
  id: string;
  target_position: string;
  suggestions: Array<{ type: string; title: string; suggestion: string }>;
  status: string;
  created_at: string;
}

interface ResumeItem {
  id: string;
  name: string;
  template_id: string;
  sections: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export default function ResumeOptimizePage() {
  const router = useRouter();
  const { user, loading, quota } = useAuth();
  const { isMember } = useMembership();
  const [resumeContent, setResumeContent] = useState('');
  const [targetPosition, setTargetPosition] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<{
    id: string;
    suggestions: Array<{ type: string; title: string; suggestion: string }>;
  } | null>(null);
  const [recentRecords, setRecentRecords] = useState<OptimizationRecord[]>([]);
  const [myResumes, setMyResumes] = useState<ResumeItem[]>([]);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchRecentRecords();
      fetchMyResumes();
    }
  }, [user]);

  const fetchRecentRecords = async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      const response = await fetch('/api/resume/my-optimizations?limit=5', {
        headers: { 'x-user-id': user.id }
      });
      const data = await response.json();
      if (data.success) {
        setRecentRecords(data.data || []);
      }
    } catch (error) {
      console.error('获取记录失败:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const fetchMyResumes = async () => {
    if (!user) return;
    try {
      const response = await fetch('/api/resume', { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setMyResumes(data.data || []);
      }
    } catch (error) {
      console.error('获取简历列表失败:', error);
    }
  };

  const handleOptimize = async () => {
    if (!user) return;
    
    if (!isMember && recentRecords.length >= 3) {
      setShowUpgradeDialog(true);
      return;
    }

    if (!resumeContent.trim() || !targetPosition) {
      return;
    }

    setIsOptimizing(true);
    try {
      const response = await fetch('/api/resume/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          content: resumeContent,
          targetPosition: targetPosition
        })
      });

      const data = await response.json();

      if (data.success) {
        setOptimizationResult(data.data);
        fetchRecentRecords();
      } else {
        alert(data.error || '优化失败');
      }
    } catch (error) {
      console.error('优化失败:', error);
      alert('优化失败，请稍后重试');
    } finally {
      setIsOptimizing(false);
    }
  };

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#165DFF] mx-auto mb-4" />
          <p className="text-[#666666] text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8fafd] via-white to-[#f0f5ff]/40">
      {/* ========== Hero 区 ========== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0a3d8f] via-[#165DFF] to-[#4d8aff] text-white">
        {/* 装饰性模糊光斑 */}
        <div className="absolute top-0 -left-20 w-[400px] h-[400px] bg-[#5b9aff] rounded-full blur-[120px] opacity-30 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[350px] h-[350px] bg-[#3D7FFF] rounded-full blur-[100px] opacity-25 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#165DFF] rounded-full blur-[150px] opacity-20 pointer-events-none" />
        
        {/* 网格纹理 */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
        
        <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-24">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
            {/* 标签 */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#60e06e] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#60e06e]" />
              </span>
              <span className="text-sm font-medium text-white/90">AI 智能驱动</span>
              <Sparkles className="w-3.5 h-3.5 text-[#FFD700]" />
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-5 tracking-tight">
              简历
              <span className="bg-gradient-to-r from-[#FFD700] via-[#FFB800] to-[#FF9A00] bg-clip-text text-transparent"> 智能优化</span>
            </h1>
            <p className="text-base md:text-lg text-white/75 leading-relaxed max-w-xl mb-10">
              粘贴简历内容，选择目标岗位，AI 深度分析并给出专业优化建议，让 HR 一眼看到你
            </p>

            {/* 统计 */}
            <div className="flex items-center gap-8 md:gap-12 text-white/60 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-0.5">30s</div>
                <div className="text-xs">快速响应</div>
              </div>
              <div className="w-px h-10 bg-white/15" />
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-0.5">3+</div>
                <div className="text-xs">维度分析</div>
              </div>
              <div className="w-px h-10 bg-white/15" />
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-0.5">98%</div>
                <div className="text-xs">用户好评</div>
              </div>
            </div>
          </div>
        </div>

        {/* 底部波浪过渡 */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 60V30C240 0 480 0 720 30C960 60 1200 60 1440 30V60H0Z" fill="#f8fafd" />
          </svg>
        </div>
      </section>

      {/* ========== AI 能力三列卡 ========== */}
      <section className="max-w-6xl mx-auto px-6 -mt-6 relative z-10 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { step: '01', icon: FileText, title: '智能解析', desc: '自动识别简历结构，精准提取教育、实习、项目等关键模块', color: '#165DFF' },
            { step: '02', icon: PenTool, title: '精准优化', desc: '基于目标岗位JD逐项比对，给出具体可操作的改进方案', color: '#3D7FFF' },
            { step: '03', icon: MessageSquare, title: 'HR视角点评', desc: '模拟真实HR快速筛选逻辑，一针见血指出亮点与硬伤', color: '#5b9aff' },
          ].map((item) => (
            <Card key={item.title} className="group relative shadow-lg hover:shadow-xl border-0 bg-white overflow-hidden transition-all duration-300 hover:-translate-y-1">
              <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, ${item.color}, ${item.color}88)` }} />
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${item.color}15, ${item.color}08)` }}>
                    <item.icon className="w-6 h-6" style={{ color: item.color }} />
                  </div>
                  <span className="text-3xl font-black text-gray-100 group-hover:text-gray-200 transition-colors select-none">{item.step}</span>
                </div>
                <h3 className="text-base font-semibold text-[#1a1a1a] mb-2 group-hover:text-[#165DFF] transition-colors">{item.title}</h3>
                <p className="text-sm text-[#777] leading-relaxed">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ========== 主内容区 ========== */}
      <section className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* 优化表单 */}
            <Card className="shadow-md border-0 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-[#165DFF] via-[#3D7FFF] to-[#5b9aff]" />
              <CardHeader className="pb-3 pt-5">
                <CardTitle className="text-lg font-semibold flex items-center gap-2 text-[#1a1a1a]">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#165DFF] to-[#3D7FFF] flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  开始优化
                </CardTitle>
                <CardDescription className="text-sm text-[#888]">
                  粘贴简历文本，选择目标岗位，AI 即刻分析
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pb-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-[#333]">
                      简历内容
                    </label>
                    <span className="text-xs text-[#aaa]">{resumeContent.length} 字</span>
                  </div>
                  <Textarea
                    placeholder="将简历全文粘贴到此处…&#10;&#10;📌 个人信息  📌 教育背景  📌 实习经历  📌 项目经历  📌 技能证书"
                    className="min-h-[220px] resize-y text-sm leading-relaxed border-gray-200 focus:border-[#165DFF] focus:ring-2 focus:ring-[#165DFF]/10 rounded-xl transition-all"
                    value={resumeContent}
                    onChange={(e) => setResumeContent(e.target.value)}
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Select value={targetPosition} onValueChange={setTargetPosition}>
                    <SelectTrigger className="sm:w-[220px] rounded-xl border-gray-200 focus:ring-2 focus:ring-[#165DFF]/10 h-11">
                      <SelectValue placeholder="🎯 选择目标岗位" />
                    </SelectTrigger>
                    <SelectContent>
                      {positions.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    className="bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] hover:from-[#165DFF] hover:to-[#165DFF] text-white font-semibold shadow-lg shadow-[#165DFF]/25 hover:shadow-xl hover:shadow-[#165DFF]/30 transition-all duration-300 rounded-xl h-11 px-6"
                    disabled={!resumeContent.trim() || !targetPosition || isOptimizing}
                    onClick={handleOptimize}
                  >
                    {isOptimizing ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> 分析优化中…</>
                    ) : (
                      <><Sparkles className="w-4 h-4 mr-2" /> 立即优化</>
                    )}
                  </Button>
                </div>
                {!isMember && (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-[#FFF7ED] rounded-xl border border-[#FF7D00]/15">
                    <Crown className="w-4 h-4 text-[#FF7D00] shrink-0" />
                    <p className="text-xs text-[#8B6914]">
                      免费用户可优化 <span className="font-semibold">3 次</span>，
                      <button onClick={() => setShowUpgradeDialog(true)} className="text-[#FF7D00] hover:underline font-semibold ml-1">
                        升级会员
                      </button>
                      不限次数
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 优化结果 */}
            {optimizationResult && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                  </div>
                  <h3 className="text-base font-semibold text-[#1a1a1a]">
                    优化建议
                    <span className="text-sm font-normal text-[#999] ml-2">共 {optimizationResult.suggestions.length} 条</span>
                  </h3>
                </div>
                {optimizationResult.suggestions.map((item, idx) => {
                  const config = item.type === 'highlight'
                    ? { bg: 'bg-green-50/80', border: 'border-l-green-400', badge: 'bg-green-100 text-green-700', dot: 'bg-green-400', label: '✨ 亮点' }
                    : item.type === 'improvement'
                    ? { bg: 'bg-orange-50/80', border: 'border-l-orange-400', badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400', label: '🔧 待改进' }
                    : { bg: 'bg-blue-50/80', border: 'border-l-blue-400', badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-400', label: '💡 建议' };

                  return (
                    <Card key={idx} className={`shadow-sm border-0 border-l-[3px] ${config.border} ${config.bg} hover:shadow-md transition-all duration-200`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Badge className={`${config.badge} border-0 text-xs font-medium shrink-0`}>
                            {config.label}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-[#1a1a1a] mb-1">{item.title}</h4>
                            <p className="text-sm text-[#555] leading-relaxed">{item.suggestion}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                <div className="flex justify-end pt-2">
                  <Button
                    variant="outline"
                    className="text-[#165DFF] border-[#165DFF]/30 hover:bg-[#165DFF]/5 hover:border-[#165DFF]/50 rounded-xl transition-all"
                    onClick={() => router.push(`/resume-optimize/${optimizationResult.id}`)}
                  >
                    查看详情 <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ========== 右侧边栏 ========== */}
          <div className="space-y-4">
            {/* 最近记录 */}
            <Card className="shadow-sm border-0">
              <CardHeader className="pb-2 pt-5">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-[#666]">
                  <Clock className="w-4 h-4 text-[#aaa]" />
                  最近优化
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                {recentRecords.length > 0 ? (
                  <div className="space-y-1">
                    {recentRecords.slice(0, 5).map((record) => (
                      <button
                        key={record.id}
                        onClick={() => router.push(`/resume-optimize/${record.id}`)}
                        className="w-full text-left p-2.5 rounded-lg hover:bg-[#165DFF]/4 transition-all group"
                      >
                        <p className="text-sm font-medium text-[#1a1a1a] group-hover:text-[#165DFF] truncate transition-colors">
                          {record.target_position}
                        </p>
                        <p className="text-xs text-[#aaa] mt-0.5">
                          {new Date(record.created_at).toLocaleDateString('zh-CN')}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#ccc] text-center py-6">暂无优化记录</p>
                )}
              </CardContent>
            </Card>

            {/* 我的简历 */}
            <Card className="shadow-sm border-0">
              <CardHeader className="pb-2 pt-5">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-[#666]">
                  <FileText className="w-4 h-4 text-[#aaa]" />
                  我的简历
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                {myResumes.length > 0 ? (
                  <div className="space-y-1">
                    {myResumes.slice(0, 5).map((resume) => (
                      <button
                        key={resume.id}
                        onClick={() => router.push(`/resume-edit/${resume.id}`)}
                        className="w-full text-left p-2.5 rounded-lg hover:bg-[#165DFF]/4 transition-all group"
                      >
                        <p className="text-sm text-[#1a1a1a] group-hover:text-[#165DFF] truncate transition-colors">
                          {resume.name || '未命名简历'}
                        </p>
                        <p className="text-xs text-[#aaa] mt-0.5">
                          {new Date(resume.updated_at).toLocaleDateString('zh-CN')}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#ccc] text-center py-6">暂无简历</p>
                )}
                <Link
                  href="/resume-edit"
                  className="flex items-center justify-center gap-1.5 text-xs text-[#165DFF] hover:text-[#3D7FFF] font-medium pt-2 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  创建新简历
                </Link>
              </CardContent>
            </Card>

            {/* 升级会员卡 */}
            {!isMember && (
              <Card className="shadow-md border-0 overflow-hidden bg-gradient-to-br from-[#FFF7ED] via-[#FFF1E0] to-[#FFE8CC]">
                <div className="h-1 bg-gradient-to-r from-[#FF7D00] to-[#FFB800]" />
                <CardContent className="p-5 pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-5 h-5 text-[#FF7D00]" />
                    <span className="font-bold text-sm text-[#1a1a1a]">升级会员</span>
                  </div>
                  <p className="text-xs text-[#8B6914] mb-4 leading-relaxed">
                    不限次数优化 · 全部模板 · HR深度点评 · 竞争力排名
                  </p>
                  <Button
                    size="sm"
                    className="w-full bg-gradient-to-r from-[#FF7D00] to-[#FF9A00] hover:from-[#FF7D00] hover:to-[#FF7D00] text-white font-semibold rounded-xl shadow-md shadow-[#FF7D00]/20"
                    onClick={() => setShowUpgradeDialog(true)}
                  >
                    立即升级 <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* ========== 升级弹窗 ========== */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl overflow-hidden p-0">
          <div className="bg-gradient-to-br from-[#FFF7ED] to-white p-6">
            <DialogHeader className="mb-4">
              <DialogTitle className="flex items-center gap-2 text-xl">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF7D00] to-[#FFB800] flex items-center justify-center">
                  <Crown className="w-4 h-4 text-white" />
                </div>
                升级会员
              </DialogTitle>
              <DialogDescription className="text-sm text-[#8B6914]">
                解锁简历优化的全部高级能力
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { icon: Zap, text: '不限次数优化' },
                  { icon: Eye, text: 'HR视角深度点评' },
                  { icon: PenTool, text: '全部模板样式' },
                  { icon: TrendingUp, text: '竞争力排名分析' },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-[#FF7D00]/10 shadow-sm">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#FF7D00]/10 to-[#FFB800]/10 flex items-center justify-center shrink-0">
                      <item.icon className="w-3.5 h-3.5 text-[#FF7D00]" />
                    </div>
                    <span className="text-xs font-medium text-[#1a1a1a]">{item.text}</span>
                  </div>
                ))}
              </div>
              <Button
                className="w-full bg-gradient-to-r from-[#FF7D00] to-[#FF9A00] hover:from-[#FF7D00] hover:to-[#FF7D00] text-white font-semibold rounded-xl h-11 shadow-lg shadow-[#FF7D00]/25"
                onClick={() => {
                  setShowUpgradeDialog(false);
                  router.push('/pricing');
                }}
              >
                <Crown className="w-4 h-4 mr-2" />
                查看会员方案
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
