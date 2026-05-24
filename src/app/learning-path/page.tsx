'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import {
  Route, BookOpen, Target, Clock, CheckCircle2, Circle,
  ArrowRight, AlertTriangle, Lightbulb, ChevronRight, Crown
} from 'lucide-react';
import { useMembership } from '@/contexts/MembershipContext';
import PaywallModal from '@/components/PaywallModal';
import { AnalyticsTracker, AnalyticsEvent, usePageView } from '@/lib/analytics/tracker';

interface LearningPhase {
  phase: string;
  skills: string[];
  estimatedDays: number;
}

interface MatchJobResult {
  job: { id: number; jobName: string; city: string; industry: string; salaryMin: number; salaryMax: number; salaryRange: string; requiredSkills: string[] };
  matchScore: number;
  gapSkills: string[];
  learningPath: LearningPhase[];
  prerequisiteChains: Record<string, string[]>;
}

interface SkillProgress {
  skillName: string;
  status: 'not_started' | 'learning' | 'practicing' | 'mastered';
  completionPct: number;
}

interface CareerPlanStep {
  stage?: string;
  title?: string;
  skills?: string[];
  duration?: string;
  [key: string]: unknown;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  mastered: { label: '已掌握', color: 'text-green-600 bg-green-50 border-green-200', icon: <CheckCircle2 className="w-5 h-5 text-green-500" /> },
  practicing: { label: '练习中', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: <Circle className="w-5 h-5 text-blue-500 fill-blue-200" /> },
  learning: { label: '学习中', color: 'text-purple-600 bg-purple-50 border-purple-200', icon: <Circle className="w-5 h-5 text-purple-500 fill-purple-200" /> },
  not_started: { label: '未开始', color: 'text-gray-500 bg-gray-50 border-gray-200', icon: <Circle className="w-5 h-5 text-gray-300" /> },
};

export default function LearningPathPage() {
  const { user, isAuthenticated } = useAuth();
  const { isMember, loading: memberLoading } = useMembership();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [matchResults, setMatchResults] = useState<MatchJobResult[]>([]);
  const [selectedJobIdx, setSelectedJobIdx] = useState(0);
  const [skillProgress, setSkillProgress] = useState<Record<string, SkillProgress>>({});
  const [careerSteps, setCareerSteps] = useState<CareerPlanStep[]>([]);

  // 埋点：页面浏览
  usePageView('learning_path');

  // 初始化 tracker
  useEffect(() => {
    if (user) {
      AnalyticsTracker.init({ userId: user.id, membershipType: isMember ? 'member' : 'free' });
    }
    return () => { AnalyticsTracker.destroy(); };
  }, [user, isMember]);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchLearningData();

      // 埋点：查看学习路径
      AnalyticsTracker.track(AnalyticsEvent.LEARNING_PATH_VIEW);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id]);

  const fetchLearningData = async () => {
    setLoading(true);
    try {
      // 获取匹配结果（含学习路径）
      const matchRes = await fetch('/api/match', {
        headers: { 'x-user-id': user!.id },
      });
      const matchData = await matchRes.json();
      if (matchData.success) {
        const results = matchData.data || [];
        setMatchResults(results);
        if (results.length > 0) setSelectedJobIdx(0);
      }

      // 获取用户画像（含技能进度）
      const profileRes = await fetch('/api/user/profile', {
        credentials: 'include',
      });
      const profileData = await profileRes.json();
      if (profileData.success) {
        const progressList: SkillProgress[] = profileData.data?.skillProgress || [];
        const progressMap: Record<string, SkillProgress> = {};
        progressList.forEach((p: SkillProgress) => {
          progressMap[p.skillName] = p;
        });
        setSkillProgress(progressMap);

        // 从 careerPlans 提取学习步骤
        const latestPlan = profileData.data?.latestCareerPlan;
        if (latestPlan?.data?.learning_path || latestPlan?.data?.action_plan) {
          setCareerSteps(latestPlan.data.learning_path || latestPlan.data.action_plan || []);
        }
      }
    } catch (err) {
      console.error('获取学习路径数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedJob = matchResults[selectedJobIdx];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <AlertTriangle className="w-16 h-16 text-orange-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">请先登录</h2>
          <p className="text-gray-500">登录后即可查看学习路径</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <Route className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">学习路径</h1>
          </div>
          <p className="text-gray-500 ml-13">根据技能缺口分析，为你规划最高效的学习路线</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-20">
            <Spinner className="w-10 h-10 text-[#165DFF]" />
            <p className="mt-4 text-gray-500">正在分析你的学习路径...</p>
          </div>
        ) : matchResults.length === 0 ? (
          <Card className="border-blue-100">
            <CardContent className="py-16 text-center">
              <BookOpen className="w-16 h-16 text-blue-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">暂无学习路径</h3>
              <p className="text-gray-400 text-sm mb-4">先完成岗位匹配，系统将根据你的技能缺口生成学习路径</p>
              <Button onClick={() => window.location.href = '/match'} className="bg-[#165DFF] hover:bg-[#165DFF]/90">
                前往匹配 <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* 左侧：岗位选择 */}
            <div className="lg:col-span-1 space-y-3">
              <h3 className="text-sm font-medium text-gray-500">选择目标岗位</h3>
              {matchResults.map((result, idx) => (
                <Card
                  key={result.job.id}
                  className={`cursor-pointer transition-all border ${
                    idx === selectedJobIdx
                      ? 'border-blue-400 ring-2 ring-blue-100'
                      : 'border-gray-100 hover:border-blue-200'
                  }`}
                  onClick={() => setSelectedJobIdx(idx)}
                >
                  <CardContent className="py-3 px-4">
                    <div className="text-sm font-medium text-gray-800 truncate">{result.job.jobName}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={`text-xs ${
                        result.matchScore >= 80 ? 'bg-green-50 text-green-700' :
                        result.matchScore >= 60 ? 'bg-blue-50 text-blue-700' :
                        'bg-orange-50 text-orange-700'
                      }`}>
                        匹配 {result.matchScore}%
                      </Badge>
                      <span className="text-xs text-gray-400">{result.gapSkills.length}个缺口</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* 右侧：学习路径详情 */}
            <div className="lg:col-span-3 space-y-6">
              {/* 目标岗位概览 */}
              <Card className="border-blue-100 overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
                <CardContent className="py-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{selectedJob?.job.jobName}</h2>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        {selectedJob?.job.city && <span>{selectedJob.job.city}</span>}
                        <span>匹配度 {selectedJob?.matchScore}%</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">技能缺口</div>
                      <div className="text-2xl font-bold text-blue-600">{selectedJob?.gapSkills.length || 0}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 学习路径时间线 */}
              {selectedJob?.learningPath && selectedJob.learningPath.length > 0 && (
                <Card className="border-blue-100">
                  <CardHeader>
                    <CardTitle className="text-blue-700 flex items-center gap-1">
                      <Target className="w-4 h-4" /> 推荐学习路径
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      {/* 竖线 */}
                      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-blue-100" />
                      <div className="space-y-6">
                        {selectedJob.learningPath
                          .slice(0, isMember ? undefined : 3)
                          .map((phase, i) => (
                          <div key={i} className="relative flex items-start gap-4 pl-2">
                            {/* 节点 */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 z-10 ${
                              i === 0 ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-600'
                            }`}>
                              {i + 1}
                            </div>
                            <div className="flex-1 pb-2">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-gray-800">{phase.phase}</h4>
                                <Badge variant="outline" className="text-xs text-gray-400">
                                  <Clock className="w-3 h-3 mr-1" /> 约{phase.estimatedDays}天
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {phase.skills.map((skill, j) => {
                                  const progress = skillProgress[skill];
                                  const cfg = statusConfig[progress?.status || 'not_started'];
                                  return (
                                    <div key={j} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm ${cfg.color}`}>
                                      {cfg.icon}
                                      <span>{skill}</span>
                                      {progress && (
                                        <span className="text-xs opacity-60">({progress.completionPct}%)</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 免费用户锁定提示 */}
              {!isMember && !memberLoading && selectedJob?.learningPath && selectedJob.learningPath.length > 3 && (
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/60 to-white/95 z-10 rounded-xl flex items-end justify-center pb-6">
                    <button
                      onClick={() => setPaywallOpen(true)}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-medium shadow-lg hover:from-amber-600 hover:to-yellow-600 transition-all"
                    >
                      <Crown className="w-5 h-5" /> 升级会员查看完整学习路径
                    </button>
                  </div>
                  <Card className="border-gray-100 opacity-50">
                    <CardHeader>
                      <CardTitle className="text-gray-400 text-sm">更多学习路径...</CardTitle>
                    </CardHeader>
                    <CardContent className="py-8">
                      <div className="space-y-4">
                        {[1, 2].map((i) => (
                          <div key={i} className="flex items-start gap-4 pl-2">
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                              <Crown className="w-4 h-4 text-gray-400" />
                            </div>
                            <div className="flex-1 h-16 bg-gray-100 rounded-lg" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* 前置技能链 */}
              {selectedJob?.prerequisiteChains && Object.keys(selectedJob.prerequisiteChains).length > 0 && (
                <Card className="border-purple-100">
                  <CardHeader>
                    <CardTitle className="text-purple-700 flex items-center gap-1">
                      <Lightbulb className="w-4 h-4" /> 技能前置关系
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(selectedJob.prerequisiteChains).map(([skill, prereqs], i) => (
                        <div key={i} className="bg-purple-50 rounded-lg p-3">
                          <div className="text-sm font-medium text-purple-800 mb-2">{skill}</div>
                          {Array.isArray(prereqs) && prereqs.length > 0 ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              {prereqs.map((p: string, j: number) => (
                                <span key={j} className="flex items-center gap-1">
                                  <Badge variant="outline" className="text-xs border-purple-300 text-purple-700">{p}</Badge>
                                  {j < prereqs.length - 1 && <ArrowRight className="w-3 h-3 text-purple-400" />}
                                </span>
                              ))}
                              <ArrowRight className="w-3 h-3 text-purple-400" />
                              <Badge className="text-xs bg-purple-600 text-white">{skill}</Badge>
                            </div>
                          ) : (
                            <span className="text-xs text-purple-500">无前置技能要求，可直接学习</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 职业规划学习计划 */}
              {careerSteps.length > 0 && (
                <Card className="border-green-100">
                  <CardHeader>
                    <CardTitle className="text-green-700 flex items-center gap-1">
                      <BookOpen className="w-4 h-4" /> 职业规划学习计划
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {careerSteps.map((step, i) => (
                        <div key={i} className="bg-green-50 rounded-lg p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-green-500 text-white text-xs flex items-center justify-center font-bold">
                              {i + 1}
                            </div>
                            <span className="font-medium text-green-800">
                              {step.stage || step.title || `阶段${i + 1}`}
                            </span>
                            {step.duration && (
                              <Badge variant="outline" className="text-xs border-green-300 text-green-600">
                                {step.duration}
                              </Badge>
                            )}
                          </div>
                          {step.skills && Array.isArray(step.skills) && step.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2 ml-8">
                              {step.skills.map((s: string, j: number) => (
                                <Badge key={j} className="text-xs bg-white text-green-700 border-green-200">
                                  {s}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 技能进度追踪 */}
              {Object.keys(skillProgress).length > 0 && (
                <Card className="border-gray-100">
                  <CardHeader>
                    <CardTitle className="text-gray-700">技能掌握进度</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(skillProgress).map(([name, prog]) => {
                        const cfg = statusConfig[prog.status || 'not_started'];
                        return (
                          <div key={name}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                {cfg.icon}
                                <span className="text-sm font-medium text-gray-700">{name}</span>
                                <Badge className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
                              </div>
                              <span className="text-sm text-gray-500">{prog.completionPct}%</span>
                            </div>
                            <Progress value={prog.completionPct} className="h-2" />
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 付费墙弹窗 */}
      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} feature="完整学习路径" />
    </div>
  );
}
