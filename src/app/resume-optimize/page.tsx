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

    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50/30">
      {/* ========== Hero 区 ========== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#165DFF] via-[#165DFF] to-[#3D7FFF] text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative max-w-6xl mx-auto px-6 py-16 md:py-20">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
            <Badge className="bg-white/20 text-white border-white/20 mb-5 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              AI 驱动
            </Badge>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4 tracking-tight">
              简历智能优化
            </h1>
            <p className="text-base md:text-lg text-white/80 leading-relaxed max-w-2xl">
              上传简历内容，选择目标岗位，AI 即刻为你分析并给出专业优化建议
            </p>
            <div className="flex items-center gap-6 mt-8 text-white/70 text-sm">
              <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-[#FFD700]" /> 秒级响应</span>
              <span className="flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-[#FFD700]" /> 精准匹配</span>
              <span className="flex items-center gap-1.5"><Eye className="w-4 h-4 text-[#FFD700]" /> HR视角</span>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white/10 to-transparent" />
      </section>

      {/* ========== AI 能力三列卡 ========== */}
      <section className="max-w-6xl mx-auto px-6 -mt-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { icon: 'FileText', title: '智能解析', desc: '自动识别简历结构，提取关键模块信息' },
            { icon: 'PenTool', title: '精准优化', desc: '基于目标岗位JD，逐项给出改进建议' },
            { icon: 'MessageSquare', title: 'HR视角点评', desc: '模拟真实HR筛选逻辑，指出亮点与不足' },
          ].map((item) => (
            <Card key={item.title} className="shadow-md hover:shadow-lg transition-shadow border-0 bg-white">
              <CardContent className="p-6">
                <div className="w-11 h-11 rounded-xl bg-[#165DFF]/10 flex items-center justify-center mb-4">
                  {item.icon === 'FileText' && <FileText className="w-5 h-5 text-[#165DFF]" />}
                  {item.icon === 'PenTool' && <PenTool className="w-5 h-5 text-[#165DFF]" />}
                  {item.icon === 'MessageSquare' && <MessageSquare className="w-5 h-5 text-[#165DFF]" />}
                </div>
                <h3 className="text-base font-semibold text-[#1a1a1a] mb-2">{item.title}</h3>
                <p className="text-sm text-[#666] leading-relaxed">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ========== 优化输入区 ========== */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="shadow-sm border-0">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#165DFF]" />
                  开始优化
                </CardTitle>
                <CardDescription>粘贴你的简历文本，选择目标岗位</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-[#333] mb-2 block">
                    简历内容
                    {myResumes.length > 0 && (
                      <span className="text-[#999] font-normal ml-2">
                        （也可从
                        <Link href="/resume-edit" className="text-[#165DFF] hover:underline mx-1">简历编辑</Link>
                        中导入）
                      </span>
                    )}
                  </label>
                  <Textarea
                    placeholder="请将你的简历全文粘贴到此处...&#10;&#10;包括：个人信息、教育背景、实习经历、项目经历、技能证书等"
                    className="min-h-[240px] resize-y text-sm leading-relaxed"
                    value={resumeContent}
                    onChange={(e) => setResumeContent(e.target.value)}
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Select value={targetPosition} onValueChange={setTargetPosition}>
                    <SelectTrigger className="sm:w-[220px]">
                      <SelectValue placeholder="选择目标岗位" />
                    </SelectTrigger>
                    <SelectContent>
                      {positions.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    className="bg-[#165DFF] hover:bg-[#165DFF]/90 text-white font-medium"
                    disabled={!resumeContent.trim() || !targetPosition || isOptimizing}
                    onClick={handleOptimize}
                  >
                    {isOptimizing ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> 优化中...</>
                    ) : (
                      <><Sparkles className="w-4 h-4 mr-2" /> 立即优化</>
                    )}
                  </Button>
                </div>
                {!isMember && (
                  <p className="text-xs text-[#999] mt-1">
                    免费用户可优化3次，
                    <button
                      onClick={() => setShowUpgradeDialog(true)}
                      className="text-[#FF7D00] hover:underline font-medium ml-1"
                    >
                      升级会员
                    </button>
                    不限次数
                  </p>
                )}
              </CardContent>
            </Card>

            {/* ========== 优化结果 ========== */}
            {optimizationResult && (
              <div className="mt-6 space-y-4">
                <h3 className="text-base font-semibold text-[#1a1a1a] flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  优化建议
                </h3>
                {optimizationResult.suggestions.map((item, idx) => (
                  <Card key={idx} className="shadow-sm border-0 hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <Badge className={
                          item.type === 'highlight' ? 'bg-green-100 text-green-700 border-green-200 shrink-0' :
                          item.type === 'improvement' ? 'bg-orange-100 text-orange-700 border-orange-200 shrink-0' :
                          'bg-blue-100 text-blue-700 border-blue-200 shrink-0'
                        }>
                          {item.type === 'highlight' ? '亮点' : item.type === 'improvement' ? '待改进' : '建议'}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-[#1a1a1a] mb-1.5">{item.title}</h4>
                          <p className="text-sm text-[#666] leading-relaxed whitespace-pre-wrap">{item.suggestion}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    className="text-[#165DFF] border-[#165DFF]/30 hover:bg-[#165DFF]/5"
                    onClick={() => router.push(`/resume-optimize/${optimizationResult.id}`)}
                  >
                    查看详情 <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ========== 右侧边栏 ========== */}
          <div className="space-y-5">
            {/* 最近记录 */}
            {recentRecords.length > 0 && (
              <Card className="shadow-sm border-0">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#165DFF]" />
                    最近优化
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recentRecords.slice(0, 5).map((record) => (
                    <button
                      key={record.id}
                      onClick={() => router.push(`/resume-optimize/${record.id}`)}
                      className="w-full text-left p-3 rounded-lg hover:bg-[#165DFF]/5 transition-colors group"
                    >
                      <p className="text-sm font-medium text-[#1a1a1a] group-hover:text-[#165DFF] truncate">
                        {record.target_position}
                      </p>
                      <p className="text-xs text-[#999] mt-1">
                        {new Date(record.created_at).toLocaleDateString('zh-CN')}
                      </p>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* 我的简历 */}
            {myResumes.length > 0 && (
              <Card className="shadow-sm border-0">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#165DFF]" />
                    我的简历
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {myResumes.slice(0, 5).map((resume) => (
                    <button
                      key={resume.id}
                      onClick={() => router.push(`/resume-edit/${resume.id}`)}
                      className="w-full text-left p-2.5 rounded-lg hover:bg-[#165DFF]/5 transition-colors group"
                    >
                      <p className="text-sm text-[#1a1a1a] group-hover:text-[#165DFF] truncate">
                        {resume.name || '未命名简历'}
                      </p>
                      <p className="text-xs text-[#999] mt-0.5">
                        {new Date(resume.updated_at).toLocaleDateString('zh-CN')}
                      </p>
                    </button>
                  ))}
                  <Link
                    href="/resume-edit"
                    className="flex items-center justify-center gap-1 text-xs text-[#165DFF] hover:underline pt-2"
                  >
                    <Plus className="w-3 h-3" />
                    创建新简历
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* 升级会员卡 */}
            {!isMember && (
              <Card className="shadow-sm border-0 bg-gradient-to-br from-[#FFF7ED] to-[#FFF1E6] border-[#FF7D00]/20">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-5 h-5 text-[#FF7D00]" />
                    <span className="font-semibold text-sm text-[#1a1a1a]">升级会员</span>
                  </div>
                  <p className="text-xs text-[#666] mb-3">
                    不限次数优化，解锁全部模板和高级功能
                  </p>
                  <Button
                    size="sm"
                    className="w-full bg-[#FF7D00] hover:bg-[#FF7D00]/90 text-white text-xs"
                    onClick={() => setShowUpgradeDialog(true)}
                  >
                    立即升级 <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* ========== 升级弹窗 ========== */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Crown className="w-5 h-5 text-[#FF7D00]" />
              升级会员
            </DialogTitle>
            <DialogDescription>
              解锁简历优化的全部能力
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Zap, text: '不限次数优化' },
                { icon: Eye, text: 'HR视角深度点评' },
                { icon: PenTool, text: '全部模板样式' },
                { icon: TrendingUp, text: '竞争力排名' },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-2 p-3 rounded-lg bg-[#165DFF]/5">
                  <item.icon className="w-4 h-4 text-[#165DFF] shrink-0" />
                  <span className="text-xs font-medium text-[#1a1a1a]">{item.text}</span>
                </div>
              ))}
            </div>
            <Button
              className="w-full bg-[#FF7D00] hover:bg-[#FF7D00]/90 text-white"
              onClick={() => {
                setShowUpgradeDialog(false);
                router.push('/pricing');
              }}
            >
              <Crown className="w-4 h-4 mr-2" />
              查看会员方案
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
