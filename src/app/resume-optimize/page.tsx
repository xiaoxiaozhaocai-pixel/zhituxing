'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, Sparkles, Crown, CheckCircle, ArrowRight, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
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

export default function ResumeOptimizePage() {
  const router = useRouter();
  const { user, loading, quota } = useAuth();
  const [resumeContent, setResumeContent] = useState('');
  const [targetPosition, setTargetPosition] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<{
    id: string;
    suggestions: Array<{ type: string; title: string; suggestion: string }>;
  } | null>(null);
  const [recentRecords, setRecentRecords] = useState<OptimizationRecord[]>([]);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  // 未登录跳转登录页
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  // 获取最近的优化记录
  useEffect(() => {
    if (user) {
      fetchRecentRecords();
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
        setRecentRecords(data.data.records);
      }
    } catch (error) {
      console.error('获取记录失败:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const handleOptimize = async () => {
    if (!user) return;
    
    // 非会员限制
    if (!quota?.is_member && recentRecords.length >= 3) {
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#165DFF]" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isMember = quota?.is_member;
  const remainingFree = Math.max(0, 3 - recentRecords.length);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                简历智能优化
              </h1>
              <p className="text-gray-600">
                AI智能分析，量身定制简历优化建议
              </p>
            </div>
            {isMember ? (
              <Badge className="bg-gradient-to-r from-[#FF7D00] to-[#FF9A00] text-white px-4 py-2">
                <Crown className="w-4 h-4 mr-1" />
                会员专属·无限使用
              </Badge>
            ) : (
              <Badge variant="secondary" className="px-4 py-2">
                免费剩余 {remainingFree} 次
              </Badge>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Upload Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-2 border-gray-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#165DFF]" />
                  上传简历内容
                </CardTitle>
                <CardDescription>
                  将简历内容粘贴到下方，或直接描述您的经历
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    目标岗位
                  </label>
                  <Select value={targetPosition} onValueChange={setTargetPosition}>
                    <SelectTrigger>
                      <SelectValue placeholder="请选择目标岗位" />
                    </SelectTrigger>
                    <SelectContent>
                      {positions.map((pos) => (
                        <SelectItem key={pos} value={pos}>
                          {pos}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    简历内容
                  </label>
                  <Textarea
                    placeholder="请粘贴您的简历内容，包括：
- 基本信息（姓名、联系方式、教育背景）
- 工作经历（公司、职位、时间、工作内容）
- 项目经验（项目名称、职责、成果）
- 技能特长（专业技能、语言能力等）"
                    value={resumeContent}
                    onChange={(e) => setResumeContent(e.target.value)}
                    className="min-h-[300px] font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    {resumeContent.length} 字，建议至少100字以获得更准确的优化建议
                  </p>
                </div>

                {!isMember && (
                  <div className="p-4 bg-[#FF7D00]/10 rounded-lg border border-[#FF7D00]/30">
                    <p className="text-sm text-[#FF7D00]">
                      <strong>会员特权：</strong>开通会员可无限次使用简历优化，获得完整优化建议和优化后简历模板
                    </p>
                    <Button
                      className="mt-2 bg-[#FF7D00] hover:bg-[#e67000] text-white"
                      size="sm"
                      onClick={() => router.push('/membership')}
                    >
                      开通会员
                    </Button>
                  </div>
                )}

                <Button
                  className="w-full bg-[#165DFF] hover:bg-[#165DFF]/90"
                  onClick={handleOptimize}
                  disabled={isOptimizing || !resumeContent.trim() || !targetPosition}
                >
                  {isOptimizing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      AI正在优化中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      开始智能优化
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Optimization Result */}
            {optimizationResult && (
              <Card className="border-2 border-[#165DFF]/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#165DFF]" />
                    优化建议
                  </CardTitle>
                  <CardDescription>
                    针对「{targetPosition}」岗位的专业优化建议
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {optimizationResult.suggestions.map((item, index) => (
                      <div key={index} className="flex gap-3 p-4 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 bg-[#165DFF]/10 rounded-full flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-4 h-4 text-[#165DFF]" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{item.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{item.suggestion}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-6 border-t">
                    <p className="text-sm text-gray-600 mb-4">
                      完整的优化后简历模板和面试准备建议已生成
                    </p>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => router.push(`/resume-optimize/${optimizationResult.id}`)}
                      >
                        查看完整报告
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                      <Button
                        className="bg-[#FF7D00] hover:bg-[#e67000] text-white"
                        onClick={() => setShowUpgradeDialog(true)}
                      >
                        获取完整优化简历
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Recent Records */}
          <div>
            <Card className="border-2 border-gray-100">
              <CardHeader>
                <CardTitle className="text-lg">最近优化记录</CardTitle>
              </CardHeader>
              <CardContent>
                {recentRecords.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">暂无优化记录</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentRecords.map((record) => (
                      <div
                        key={record.id}
                        className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                        onClick={() => router.push(`/resume-optimize/${record.id}`)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            {record.target_position}
                          </span>
                          <Badge variant={record.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                            {record.status === 'completed' ? '已完成' : '处理中'}
                          </Badge>
                        </div>
                        <div className="flex items-center text-xs text-gray-500">
                          <Clock className="w-3 h-3 mr-1" />
                          {new Date(record.created_at).toLocaleDateString('zh-CN')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tips */}
            <Card className="mt-4 border-2 border-[#165DFF]/20 bg-gradient-to-br from-[#165DFF]/5 to-white">
              <CardContent className="p-4">
                <h4 className="font-medium text-gray-900 mb-2">优化小贴士</h4>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                    简历内容越详细，优化建议越精准
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                    使用STAR法则描述工作成果
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                    针对不同岗位准备差异化简历
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                    量化工作成果更有说服力
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-[#FF7D00]" />
              开通会员解锁完整功能
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-2">
              <p>您本月的免费简历优化次数已用完</p>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <p className="font-medium text-gray-900">会员专属权益</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>无限次简历优化</li>
                  <li>完整优化后简历模板</li>
                  <li>AI模拟面试无限次</li>
                  <li>职业规划报告生成</li>
                </ul>
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  className="flex-1 bg-[#FF7D00] hover:bg-[#e67000] text-white"
                  onClick={() => router.push('/membership')}
                >
                  立即开通会员
                </Button>
                <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
                  稍后再说
                </Button>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
