'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/hooks/useAuth';
import JdMatchCard from '@/components/cards/JdMatchCard';
import { AnalyticsTracker, AnalyticsEvent, usePageView } from '@/lib/analytics/tracker';
import Link from 'next/link';
import {
  Target, Search, SlidersHorizontal, ChevronDown, ChevronUp,
  MapPin, DollarSign, TrendingUp, Briefcase, AlertTriangle, Lock, LogIn, Sparkles, EyeOff, MessageCircle, BookOpen
} from 'lucide-react';

interface MatchJobResult {
  job: {
    id: number;
    jobName: string;
    city: string;
    industry: string;
    salaryMin: number;
    salaryMax: number;
    salaryRange: string;
    requiredSkills: string[];
  };
  matchScore: number;
  weightedScore: number;
  matchedSkills: string[];
  gapSkills: string[];
  requiredGaps: string[];
  learningPath: { phase: string; skills: string[]; estimatedDays: number }[];
  salary: { estimatedMin: number; estimatedMax: number; estimatedMedian: number };
}

interface UnderratedJob {
  jobName: string;
  matchScore: number;
  reason: string;
  city?: string;
  industry?: string;
}

type SortKey = 'matchScore' | 'salary' | 'city';

export default function MatchPage() {
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MatchJobResult[]>([]);
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [targetPosition, setTargetPosition] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('matchScore');
  const [cityFilter, setCityFilter] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [fetched, setFetched] = useState(false);
  const [underratedJobs, setUnderratedJobs] = useState<UnderratedJob[]>([]);
  const [underratedLoading, setUnderratedLoading] = useState(false);

  // 埋点：页面浏览
  usePageView('match');

  // 初始化 tracker
  useEffect(() => {
    if (user) {
      AnalyticsTracker.init({ userId: user.id, membershipType: 'free' });
    }
    return () => { AnalyticsTracker.destroy(); };
  }, [user]);

  const handleMatch = async () => {
    if (!user?.id) return;
    setLoading(true);

    // 埋点：查看匹配结果
    AnalyticsTracker.track(AnalyticsEvent.MATCH_VIEW, { target_position: targetPosition || 'auto' });
    try {
      const params = new URLSearchParams();
      if (targetPosition) params.set('target_position', targetPosition);

      const res = await fetch(`/api/match?${params.toString()}`, {
        headers: { 'x-user-id': user.id },
      });
      const data = await res.json();
      if (data.ok && data.data) {
        setResults(data.data.matches || []);
        setUserSkills(data.data.user_skills || []);

        // 获取反向匹配数据
        if (data.data.user_skills && data.data.user_skills.length > 0) {
          fetchUnderratedJobs(data.data.user_skills);
        }
      }
    } catch (err) {
      console.error('匹配失败:', err);
    } finally {
      setLoading(false);
      setFetched(true);
    }
  };

  // 获取反向匹配（被低估的好机会）
  const fetchUnderratedJobs = async (skills: string[]) => {
    if (!user?.id || skills.length === 0) return;
    setUnderratedLoading(true);
    try {
      const res = await fetch('/api/match/underrated', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id 
        },
        body: JSON.stringify({ skills }),
      });
      const data = await res.json();
      if (data.success) {
        setUnderratedJobs(data.data || []);
      }
    } catch (err) {
      console.error('获取反向匹配失败:', err);
    } finally {
      setUnderratedLoading(false);
    }
  };

  // 自动触发匹配
  useEffect(() => {
    if (isAuthenticated && user?.id && !fetched) {
      handleMatch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id]);

  // 筛选 & 排序
  const filtered = results
    .filter((r) => !cityFilter || r.job.city?.includes(cityFilter))
    .sort((a, b) => {
      if (sortBy === 'matchScore') return b.matchScore - a.matchScore;
      if (sortBy === 'salary') return (b.salary?.estimatedMedian || 0) - (a.salary?.estimatedMedian || 0);
      return (a.job.city || '').localeCompare(b.job.city || '');
    });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4">
          {/* 页面标题 */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-amber-500 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">岗位匹配</h1>
            </div>
            <p className="text-gray-500 ml-13">基于你的技能画像，智能匹配最适合的岗位</p>
          </div>

          {/* 登录提示卡片 */}
          <Card className="border-blue-100 shadow-xl">
            <CardContent className="py-16 text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Lock className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">登录后解锁完整功能</h3>
              <p className="text-gray-500 mb-6">登录后可保存匹配结果，查看详细技能分析，获取专属学习建议</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
                <Link href="/auth">
                  <Button className="w-full sm:w-auto px-8 py-6 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg">
                    <LogIn className="w-5 h-5 mr-2" />
                    立即登录
                  </Button>
                </Link>
                <Link href="/jobs">
                  <Button variant="outline" className="w-full sm:w-auto px-6 py-6">
                    先浏览岗位
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
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
            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-amber-500 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">岗位匹配</h1>
          </div>
          <p className="text-gray-500 ml-13">基于你的技能画像，智能匹配最适合的岗位</p>
        </div>

        {/* 搜索和筛选栏 */}
        <Card className="mb-6 border-blue-100">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="输入目标岗位，如：新媒体运营、Java开发"
                  value={targetPosition}
                  onChange={(e) => setTargetPosition(e.target.value)}
                  className="pl-10"
                  onKeyDown={(e) => e.key === 'Enter' && handleMatch()}
                />
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="城市筛选"
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  className="w-32"
                />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortKey)}
                  className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm"
                >
                  <option value="matchScore">按匹配度</option>
                  <option value="salary">按薪资</option>
                  <option value="city">按城市</option>
                </select>
                <Button onClick={handleMatch} disabled={loading} className="bg-[#165DFF] hover:bg-[#165DFF]/90">
                  {loading ? <Spinner className="w-4 h-4 mr-1" /> : <SlidersHorizontal className="w-4 h-4 mr-1" />}
                  匹配
                </Button>
              </div>
            </div>
            {/* 用户技能展示 */}
            {userSkills.length > 0 && (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500">你的技能：</span>
                {userSkills.map((s, i) => (
                  <Badge key={i} variant="secondary" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                    {s}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 匹配结果 */}
        {loading && (
          <div className="flex flex-col items-center py-20">
            <Spinner className="w-10 h-10 text-[#165DFF]" />
            <p className="mt-4 text-gray-500">正在匹配最适合你的岗位...</p>
          </div>
        )}

        {!loading && fetched && filtered.length === 0 && (
          <Card className="border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50">
            <CardContent className="py-16 text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Briefcase className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">还没有找到匹配的岗位</h3>
              <p className="text-gray-500 max-w-md mx-auto mb-8">
                别着急，好工作值得等待～先完善你的技能信息，让AI更懂你
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/profile/info">
                  <Button className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg px-6 py-5">
                    去完善个人信息
                  </Button>
                </Link>
                <Link href="/jobs">
                  <Button variant="outline" className="px-6 py-5 border-amber-200 text-amber-700 hover:bg-amber-50">
                    浏览岗位百科
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && filtered.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">共找到 <strong className="text-[#165DFF]">{filtered.length}</strong> 个匹配岗位</span>
            </div>
            {filtered.map((item) => {
              const isExpanded = expandedId === item.job.id;
              return (
                <Card
                  key={item.job.id}
                  className="border-orange-100 overflow-hidden hover:shadow-lg hover:border-orange-300 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  aria-label={`${item.job.jobName}，匹配度${item.matchScore}%，点击${isExpanded ? '收起' : '展开'}详情`}
                  onClick={() => setExpandedId(isExpanded ? null : item.job.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setExpandedId(isExpanded ? null : item.job.id);
                    }
                  }}
                >
                  <div className="h-1 bg-gradient-to-r from-orange-400 to-amber-500" />
                  <CardContent className="py-5">
                    {/* 头部：匹配度 + 岗位信息 */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      {/* 匹配度环 */}
                      <div className="relative w-20 h-20 shrink-0">
                        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                          <circle cx="40" cy="40" r="34" fill="none" stroke="#FFF7ED" strokeWidth="5" />
                          <circle
                            cx="40" cy="40" r="34" fill="none"
                            className={item.matchScore >= 80 ? 'stroke-green-500' : item.matchScore >= 60 ? 'stroke-orange-500' : 'stroke-red-400'}
                            strokeWidth="5"
                            strokeDasharray={2 * Math.PI * 34}
                            strokeDashoffset={2 * Math.PI * 34 - (item.matchScore / 100) * 2 * Math.PI * 34}
                            strokeLinecap="round"
                            style={{ transition: 'stroke-dashoffset 0.7s ease' }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className={`text-lg font-bold ${item.matchScore >= 80 ? 'text-green-500' : item.matchScore >= 60 ? 'text-orange-500' : 'text-red-400'}`}>
                            {item.matchScore}%
                          </span>
                        </div>
                      </div>

                      {/* 岗位信息 */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 truncate">{item.job.jobName}</h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                          {item.job.city && (
                            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{item.job.city}</span>
                          )}
                          {item.job.industry && (
                            <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />{item.job.industry}</span>
                          )}
                          {item.salary?.estimatedMedian && (
                            <span className="flex items-center gap-1 text-amber-600 font-medium">
                              <DollarSign className="w-3.5 h-3.5" />
                              {(item.salary.estimatedMin / 1000).toFixed(1)}k-{(item.salary.estimatedMax / 1000).toFixed(1)}k
                            </span>
                          )}
                        </div>
                        {/* 技能标签摘要 */}
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {item.matchedSkills.slice(0, 3).map((s, i) => (
                            <Badge key={i} className="text-xs bg-green-50 text-green-700 border-green-200 hover:bg-green-50">
                              {s.length > 12 ? s.slice(0, 12) + '...' : s}
                            </Badge>
                          ))}
                          {item.gapSkills.slice(0, 2).map((s, i) => (
                            <Badge key={`g${i}`} className="text-xs bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-50">
                              {s.length > 12 ? s.slice(0, 12) + '...' : s}
                            </Badge>
                          ))}
                          {(item.matchedSkills.length + item.gapSkills.length > 5) && (
                            <Badge variant="outline" className="text-xs">+{item.matchedSkills.length + item.gapSkills.length - 5}</Badge>
                          )}
                        </div>
                      </div>

                      {/* 展开按钮（与卡片同步状态，点击不再冒泡到 Card） */}
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedId(isExpanded ? null : item.job.id);
                        }}
                        aria-hidden="true"
                        tabIndex={-1}
                        className="shrink-0"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        详情
                      </Button>
                    </div>

                    {/* 展开详情 */}
                    {isExpanded && (
                      <div className="mt-5 pt-5 border-t border-gray-100 space-y-5">
                        {/* 匹配技能 */}
                        <div>
                          <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-1">
                            <TrendingUp className="w-4 h-4" /> 已匹配技能 ({item.matchedSkills.length})
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {item.matchedSkills.map((s, i) => (
                              <Badge key={i} className="bg-green-50 text-green-700 border-green-200 hover:bg-green-50">
                                {s}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* 技能缺口 */}
                        <div>
                          <h4 className="text-sm font-medium text-orange-700 mb-2 flex items-center gap-1">
                            <AlertTriangle className="w-4 h-4" /> 技能缺口 ({item.gapSkills.length})
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {item.gapSkills.map((s, i) => (
                              <Badge key={i} className="bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-50">
                                {s}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* 薪资估算 */}
                        {item.salary && (
                          <div className="bg-amber-50 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-amber-700 mb-2">薪资估算（基于匹配度 {item.matchScore}%）</h4>
                            <div className="flex items-center gap-4">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-amber-600">
                                  {(item.salary.estimatedMin / 1000).toFixed(1)}k
                                </div>
                                <div className="text-xs text-gray-500">预估最低</div>
                              </div>
                              <span className="text-gray-400">—</span>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-amber-600">
                                  {(item.salary.estimatedMax / 1000).toFixed(1)}k
                                </div>
                                <div className="text-xs text-gray-500">预估最高</div>
                              </div>
                              <span className="text-gray-400">|</span>
                              <div className="text-center">
                                <div className="text-lg font-semibold text-gray-700">
                                  {(item.salary.estimatedMedian / 1000).toFixed(1)}k
                                </div>
                                <div className="text-xs text-gray-500">中位数</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 学习路径 */}
                        {item.learningPath && item.learningPath.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-blue-700 mb-3">推荐学习路径</h4>
                            <div className="space-y-3">
                              {item.learningPath.map((phase, i) => (
                                <div key={i} className="flex items-start gap-3">
                                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold shrink-0">
                                    {i + 1}
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-700">{phase.phase}</div>
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                      {phase.skills.map((s, j) => (
                                        <Badge key={j} variant="outline" className="text-xs">{s}</Badge>
                                      ))}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">预计 {phase.estimatedDays} 天</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* 操作按钮 */}
                        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100">
                          <Link href={`/assistant?bot=xiaozhi&query=帮我针对${encodeURIComponent(item.job.jobName)}岗位准备模拟面试`}>
                            <Button size="sm" className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white">
                              <MessageCircle className="w-4 h-4 mr-1" /> 模拟面试
                            </Button>
                          </Link>
                          <Link href="/learning-path">
                            <Button size="sm" variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
                              <BookOpen className="w-4 h-4 mr-1" /> 学习路径
                            </Button>
                          </Link>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* 反向匹配区域：被你忽略的好机会 */}
        {!loading && fetched && userSkills.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">被你忽略的好机会</h2>
                <p className="text-sm text-gray-500">根据你的能力，你可能低估了这些岗位</p>
              </div>
            </div>

            {underratedLoading ? (
              <Card className="border-violet-100">
                <CardContent className="py-10 text-center">
                  <Spinner className="w-8 h-8 text-violet-500 mx-auto" />
                  <p className="mt-3 text-gray-500 text-sm">正在分析你的隐藏优势...</p>
                </CardContent>
              </Card>
            ) : underratedJobs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {underratedJobs.map((job, i) => (
                  <Card key={i} className="border-violet-100 hover:shadow-lg transition-shadow overflow-hidden group cursor-pointer">
                    <div className="h-1 bg-gradient-to-r from-violet-500 to-purple-600" />
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-bold text-gray-900 group-hover:text-violet-600 transition-colors">
                          {job.jobName}
                        </h3>
                        <div className="flex items-center gap-1 text-violet-600 bg-violet-50 px-2 py-1 rounded-full text-xs font-medium">
                          <EyeOff className="w-3 h-3" />
                          被低估
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mb-2 text-sm text-gray-500">
                        {job.city && <span><MapPin className="w-3 h-3 inline mr-1" />{job.city}</span>}
                        {job.industry && <span><Briefcase className="w-3 h-3 inline mr-1" />{job.industry}</span>}
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="text-2xl font-bold text-violet-600">{job.matchScore}%</div>
                        <div className="text-xs text-gray-500">匹配度</div>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        <span className="text-violet-600 font-medium">为什么被低估：</span>
                        {job.reason}
                      </p>
                      <div className="mt-4 pt-3 border-t border-violet-100">
                        <Link href={`/assistant?bot=xiaozhi&query=帮我针对${encodeURIComponent(job.jobName)}岗位准备模拟面试，这个岗位被低估了`}>
                          <Button size="sm" variant="outline" className="w-full border-violet-200 text-violet-700 hover:bg-violet-50 hover:border-violet-300">
                            <MessageCircle className="w-4 h-4 mr-1" /> 模拟面试
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-violet-100">
                <CardContent className="py-10 text-center">
                  <Sparkles className="w-10 h-10 text-violet-300 mx-auto mb-3" />
                  <p className="text-gray-500">暂无被低估的岗位推荐</p>
                  <p className="text-gray-400 text-sm mt-1">完善更多技能信息，解锁隐藏机会</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* 未登录/无技能时显示解锁提示 */}
        {!loading && fetched && userSkills.length === 0 && filtered.length > 0 && (
          <div className="mt-10">
            <Card className="border-violet-100 bg-gradient-to-br from-violet-50 to-purple-50">
              <CardContent className="py-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">解锁反向匹配</h3>
                <p className="text-gray-500 text-sm mb-4">完成技能画像后，发现你被低估的好机会</p>
                <Link href="/assessment">
                  <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700">
                    去完善技能画像
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
