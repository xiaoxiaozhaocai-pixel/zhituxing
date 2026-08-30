'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Sparkles, 
  Loader2, 
  AlertCircle,
  Download,
  Share2,
  ChevronDown,
  ChevronUp,
  Briefcase,
  MapPin,
  TrendingUp,
  Calendar,
  ArrowLeft,
  Target,
  BookOpen,
  MessageSquare,
  CheckCircle2,
  Circle,
  ListChecks } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';

// 报告数据接口
interface ReportData {
  id: number;
  user_id: number;
  major: string;
  grade: string;
  city: string;
  is_latest: number;
  create_time: string;
  core_jobs: Array<{
    name: string;
    match_score: number;
    industry: string;
    city: string;
    salary_range: string;
  }>;
  dimensions: {
    personality: number;
    major: number;
    ability: number;
    interest: number;
    values: number;
    risk: number;
  };
  dimension_insight: Record<string, {
    evidence: string;
    reason: string;
    path: string;
    suggestion: string;
  }> | null;
  career_path: Array<{
    stage: string;
    action: string;
  }>;
  skills_gap: Array<{
    skill: string;
    current: number;
    target: number;
  }>;
  action_plan: Array<{
    month: string;
    task: string;
    status: string;
  }>;
}

const DIMS = [
  { key: 'personality', label: '性格匹配' },
  { key: 'major', label: '专业匹配' },
  { key: 'ability', label: '能力匹配' },
  { key: 'interest', label: '兴趣匹配' },
  { key: 'values', label: '价值观匹配' },
  { key: 'risk', label: '风险承受' },
] as const;

export default function ReportPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [_isDownloading, _setIsDownloading] = useState(false);

  // P1-a：报告末尾「我要怎么做」3条可勾选阶段目标+跟踪
  // fullSkillProgress：完整 skill_progress（含类型 skill 与 goal），写回时基于它合并，避免互相覆盖
  const [fullSkillProgress, setFullSkillProgress] = useState<Array<Record<string, unknown>>>([]);
  const [goalProgress, setGoalProgress] = useState<Record<string, boolean>>({});
  const [goalSaving, setGoalSaving] = useState(false);
  
  // 折叠面板状态
  const [expandedPanels, setExpandedPanels] = useState<Record<string, boolean>>({
    dimensions: true,
    careerPath: false,
    skillsGap: false,
    actionPlan: false
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && params.id) {
// eslint-disable-next-line react-hooks/immutability
      fetchReport();
    }
// eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, params.id]);

  const fetchReport = async () => {
    if (!user || !params.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/career-planning/report/${params.id}`, {
        headers: {
          'x-user-id': user.id.toString()
        }
      });
      
      const data = await response.json();
      
      if (data.code === 200) {
        setReport(data.data);

        // P1-a：并行读取目标跟踪进度（skill_progress 中 type=goal 的元素）
        try {
          const profileRes = await fetch('/api/user/profile', {
            credentials: 'include',
            headers: { 'x-user-id': user.id.toString() },
          });
          const profileData = await profileRes.json();
          if (profileData.success) {
            const sp = Array.isArray(profileData.data?.skill_progress)
              ? profileData.data.skill_progress
              : (Array.isArray(profileData.data?.skillProgress) ? profileData.data?.skillProgress : []);
            setFullSkillProgress(sp);
            const goalMap: Record<string, boolean> = {};
            sp.forEach((g: Record<string, unknown>) => {
              if (g && g.type === 'goal' && g.key) goalMap[g.key as string] = !!g.done;
            });
            setGoalProgress(goalMap);
          }
        } catch (e) {
          console.warn('读取目标跟踪失败:', e);
        }
      } else {
        setError(data.message || '获取报告失败');
      }
    } catch (error) {
      console.error('获取报告失败:', error);
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // P1-a：切换阶段目标勾选状态并写回（合并保留非 goal 元素）
  const toggleGoal = async (key: string) => {
    const next = { ...goalProgress, [key]: !goalProgress[key] };
    setGoalProgress(next);
    setGoalSaving(true);
    try {
      const currentGoals: Record<string, Record<string, unknown>> = {};
      (fullSkillProgress || []).forEach((g) => {
        if (g.type === 'goal' && g.key) currentGoals[g.key as string] = g;
      });
      const goals = (report?.career_path || []).map((item, idx) => {
        const k = `cp_${idx}`;
        const existing = currentGoals[k] || {};
        const nowDone = !!next[k];
        return {
          type: 'goal',
          key: k,
          label: item.stage,
          action: item.action,
          done: nowDone,
          done_at: nowDone ? (existing.done_at || new Date().toISOString()) : undefined,
        };
      });
      const nonGoal = (fullSkillProgress || []).filter((g) => g.type !== 'goal');
      const newArr = [...nonGoal, ...goals];
      setFullSkillProgress(newArr);
      await fetch('/api/user/profile', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user!.id.toString() },
        body: JSON.stringify({ skill_progress: newArr }),
      });
    } catch (e) {
      console.warn('保存目标失败:', e);
    } finally {
      setGoalSaving(false);
    }
  };

  const togglePanel = (panel: string) => {
    setExpandedPanels(prev => ({
      ...prev,
      [panel]: !prev[panel]
    }));
  };

  // 格式化日期
  const _formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#722ED1] animate-spin" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">获取报告失败</h2>
            <p className="text-slate-500 mb-6">{error || '报告不存在'}</p>
            <Link href="/career-planning">
              <Button className="bg-[#722ED1] hover:bg-[#722ED1]/90">
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回生成页
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部状态栏 */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/career-planning/my-reports" className="text-slate-500 hover:text-slate-700">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-slate-900">我的职业规划报告</h1>
            {report.is_latest === 1 && (
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">最新</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Download className="w-4 h-4 mr-1" />
              下载PDF
            </Button>
            <Button variant="outline" size="sm" disabled>
              <Share2 className="w-4 h-4 mr-1" />
              分享
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 核心结论区 */}
        <Card className="mb-6 bg-gradient-to-br from-[#165DFF]/5 to-[#3D7FFF]/5 border-[#165DFF]/15">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#165DFF]">
              <Target className="w-6 h-6" />
              你的核心职业方向
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {report.core_jobs.map((job, index) => (
                <Card key={index} className="bg-white hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-slate-900">{job.name}</h3>
                      <span className="px-2 py-1 bg-[#165DFF]/10 text-[#165DFF] text-sm font-medium rounded-full">
                        {job.match_score}%匹配
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4" />
                        {job.industry}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {job.city}
                      </div>
                      <div className="flex items-center gap-2 text-[#FF7D00]">
                        <TrendingUp className="w-4 h-4" />
                        {job.salary_range}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-3 text-[#165DFF] border-[#165DFF]/30 hover:bg-[#165DFF]/5">
                      查看详细分析
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 详细分析区 - 折叠面板 */}
        <div className="space-y-4 mb-24">
          {/* 面板1：6维诊断模型 */}
          <Card className="overflow-hidden">
            <CardHeader 
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => togglePanel('dimensions')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#165DFF]" />
                  6维诊断模型
                </CardTitle>
                {expandedPanels.dimensions ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </CardHeader>
            {expandedPanels.dimensions && (
              <CardContent className="pb-6">
                {/* 6维诊断雷达图（真实图表） */}
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={[
                        { dim: '人格', value: report?.dimensions.personality ?? 0 },
                        { dim: '专业', value: report?.dimensions.major ?? 0 },
                        { dim: '能力', value: report?.dimensions.ability ?? 0 },
                        { dim: '兴趣', value: report?.dimensions.interest ?? 0 },
                        { dim: '价值观', value: report?.dimensions.values ?? 0 },
                        { dim: '风险', value: report?.dimensions.risk ?? 0 },
                      ]} cx="50%" cy="50%" outerRadius="72%">
                        <PolarGrid stroke="#e5eefb" />
                        <PolarAngleAxis dataKey="dim" tick={{ fill: '#4e5b6f', fontSize: 13 }} />
                        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} tickLine={false} />
                        <Radar name="诊断" dataKey="value" stroke="#165DFF" fill="#165DFF" fillOpacity={0.32} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                </div>
                {/* 判断力详解 · 依据与提升路径 */}
                <div className="mt-6 space-y-4">
                  <h4 className="text-sm font-semibold text-[#165DFF]">判断力详解 · 依据与提升路径</h4>
                  {report?.dimension_insight ? (
                    <div className="space-y-3">
                      {DIMS.map(d => {
                        const ins = report.dimension_insight?.[d.key];
                        if (!ins) return null;
                        return (
                          <div key={d.key} className="rounded-xl border border-[#165DFF]/15 bg-[#165DFF]/5 p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-slate-800">{d.label}</span>
                              <span className="text-sm text-[#165DFF]">得分 {report.dimensions[d.key]}%</span>
                            </div>
                            <div className="space-y-1.5 text-sm text-slate-600">
                              <p><span className="text-slate-400">依据：</span>{ins.evidence}</p>
                              <p><span className="text-slate-400">判定：</span>{ins.reason}</p>
                              <p><span className="text-slate-400">提升：</span>{ins.path}</p>
                              <p><span className="text-slate-400">建议：</span>{ins.suggestion}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">报告生成时间较早，暂无逐维度判断依据；重新生成报告可获得完整判断力详解。</p>
                  )}
                </div>
              </CardContent>
            )}
          </Card>

          {/* 面板2：职业发展路径 */}
          <Card className="overflow-hidden">
            <CardHeader 
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => togglePanel('careerPath')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#165DFF]" />
                  职业发展路径
                </CardTitle>
                {expandedPanels.careerPath ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </CardHeader>
            {expandedPanels.careerPath && (
              <CardContent className="pb-6">
                {/* 时间线占位容器 */}
                <div className="border-2 border-dashed border-[#165DFF]/20 rounded-xl bg-[#165DFF]/5 p-6">
                  <div className="space-y-4">
                    {report.career_path.map((item, index) => (
                      <div key={index} className="flex items-start gap-4">
                        <div className="w-24 flex-shrink-0">
                          <span className="px-2 py-1 bg-[#165DFF]/10 text-[#165DFF] text-sm rounded font-medium">
                            {item.stage}
                          </span>
                        </div>
                        <div className="flex-1 pb-4 border-b border-[#165DFF]/10 last:border-0 last:pb-0">
                          <p className="text-slate-700">{item.action}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* 面板3：技能缺口分析 */}
          <Card className="overflow-hidden">
            <CardHeader 
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => togglePanel('skillsGap')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#165DFF]" />
                  技能缺口分析
                </CardTitle>
                {expandedPanels.skillsGap ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </CardHeader>
            {expandedPanels.skillsGap && (
              <CardContent className="pb-6">
                {/* 对比图占位容器 */}
                <div className="border-2 border-dashed border-[#165DFF]/20 rounded-xl bg-[#165DFF]/5 p-6">
                  <div className="space-y-4">
                    {report.skills_gap.map((item, index) => (
                      <div key={index}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-slate-700">{item.skill}</span>
                          <span className="text-sm text-slate-500">
                            当前{item.current}% → 目标{item.target}%
                          </span>
                        </div>
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] rounded-full transition-all"
                            style={{ width: `${(item.current / item.target) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* 面板4：全年行动清单 */}
          <Card className="overflow-hidden">
            <CardHeader 
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => togglePanel('actionPlan')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-green-500" />
                  全年行动清单
                </CardTitle>
                {expandedPanels.actionPlan ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </CardHeader>
            {expandedPanels.actionPlan && (
              <CardContent className="pb-6">
                {/* 表格占位容器 */}
                <div className="border-2 border-dashed border-green-200 rounded-xl bg-green-50/50 p-6">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-green-200">
                          <th className="text-left py-2 px-3 font-medium text-slate-700">月份</th>
                          <th className="text-left py-2 px-3 font-medium text-slate-700">任务</th>
                          <th className="text-left py-2 px-3 font-medium text-slate-700">状态</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.action_plan.map((item, index) => (
                          <tr key={index} className="border-b border-green-100 last:border-0">
                            <td className="py-3 px-3 text-slate-600">{item.month}</td>
                            <td className="py-3 px-3 text-slate-700">{item.task}</td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                item.status === 'completed' 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {item.status === 'completed' ? '已完成' : '待完成'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* P1-a：我要怎么做 - 3条可勾选阶段目标+跟踪 */}
        {report.career_path && report.career_path.length > 0 && (
          <Card className="mb-6 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-[#165DFF] to-[#3D7FFF]" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#165DFF]">
                <ListChecks className="w-5 h-5" />
                我要怎么做
              </CardTitle>
              <p className="text-sm text-slate-400 -mt-2">勾选你已完成的阶段目标，进度会自动同步到「我的求职档案」</p>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="space-y-3">
                {report.career_path.map((item, idx) => {
                  const k = `cp_${idx}`;
                  const done = !!goalProgress[k];
                  return (
                    <button
                      key={k}
                      onClick={() => toggleGoal(k)}
                      disabled={goalSaving}
                      className={`w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                        done ? 'border-blue-200 bg-blue-50/60' : 'border-slate-200 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                    >
                      {done ? (
                        <CheckCircle2 className="w-5 h-5 text-[#165DFF] mt-0.5 shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300 mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-[#165DFF]/10 text-[#165DFF] text-xs rounded font-medium">{item.stage}</span>
                          {done && <span className="text-xs text-green-600">已完成</span>}
                        </div>
                        <p className="mt-1 text-sm text-slate-700">{item.action}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 会员转化引导 - 仅非会员可见 */}
        <Card className="mt-8 bg-gradient-to-r from-[#FF7D00] to-[#FF9A3D] border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-white mb-2">📊 完整能力匹配雷达图已生成</h3>
              <p className="text-white/90 text-sm mb-4">开通 9.9元终身会员 即可解锁全部内容：</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              <div className="flex items-center gap-2 text-white/90 text-sm">
                <span className="text-green-300">✓</span> 6项核心能力完整分析
              </div>
              <div className="flex items-center gap-2 text-white/90 text-sm">
                <span className="text-green-300">✓</span> 与TOP10%学长学姐能力对比
              </div>
              <div className="flex items-center gap-2 text-white/90 text-sm">
                <span className="text-green-300">✓</span> 专属技能提升计划+学习资源
              </div>
              <div className="flex items-center gap-2 text-white/90 text-sm">
                <span className="text-green-300">✓</span> 无限次全流程AI模拟面试
              </div>
              <div className="flex items-center gap-2 text-white/90 text-sm sm:col-span-2">
                <span className="text-green-300">✓</span> 每月自动生成职业规划动态复盘报告
              </div>
            </div>
            <div className="text-center">
              <Link href="/membership">
                <Button className="bg-white text-[#FF7D00] hover:bg-gray-100 font-bold text-lg px-8">
                  立即开通9.9元终身会员
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* 行动按钮区 - 固定底部 */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 py-4 px-4 z-10">
          <div className="max-w-6xl mx-auto flex flex-wrap justify-center gap-3">
            <Link href="/jobs">
              <Button className="bg-[#165DFF] hover:bg-[#165DFF]/90">
                <Briefcase className="w-4 h-4 mr-2" />
                查看匹配岗位
              </Button>
            </Link>
            <Link href="/assistant?bot=interview">
              <Button className="bg-[#00B42A] hover:bg-[#00B42A]/90">
                <MessageSquare className="w-4 h-4 mr-2" />
                开始模拟面试
              </Button>
            </Link>
            <Link href="/resources">
              <Button className="bg-[#722ED1] hover:bg-[#722ED1]/90">
                <BookOpen className="w-4 h-4 mr-2" />
                学习技能
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
