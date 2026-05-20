'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/hooks/useAuth';
import SkillAssessmentCard from '@/components/cards/SkillAssessmentCard';
import {
  BarChart3, TrendingUp, Award, AlertTriangle, History, ChevronRight,
  ArrowUpRight, ArrowDownRight, Minus, Crown, Lock, LogIn
} from 'lucide-react';
import { useMembership } from '@/contexts/MembershipContext';
import PaywallModal from '@/components/PaywallModal';
import { AnalyticsTracker, AnalyticsEvent, usePageView } from '@/lib/analytics/tracker';

interface Dimension {
  name: string;
  level: string;
  score: number;
  percentile: number;
}

interface AssessmentRecord {
  id: number;
  data: {
    grade?: string;
    dimensions?: Dimension[];
    gap_skills?: string[];
    match_score?: number;
    overall_score?: number;
    target_position?: string;
    [key: string]: unknown;
  };
  createdAt: string;
}

interface PercentileInfo {
  percentileRank: number;
  totalUsers: number;
  userRank: number;
}

export default function AssessmentPage() {
  const { user, isAuthenticated } = useAuth();
  const { isMember, loading: memberLoading } = useMembership();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<AssessmentRecord[]>([]);
  const [percentile, setPercentile] = useState<PercentileInfo | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [growthData, setGrowthData] = useState<{ date: string; score: number }[]>([]);

  // 埋点：页面浏览
  usePageView('assessment');

  // 初始化 tracker
  useEffect(() => {
    if (user) {
      AnalyticsTracker.init({ userId: user.id, membershipType: isMember ? 'member' : 'free' });
    }
    return () => { AnalyticsTracker.destroy(); };
  }, [user, isMember]);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchAssessment();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id]);

  const fetchAssessment = async () => {
    setLoading(true);

    // 埋点：开始测评
    AnalyticsTracker.track(AnalyticsEvent.ASSESSMENT_START);
    try {
      const res = await fetch('/api/assessment', {
        headers: { 'x-user-id': user!.id },
      });
      const data = await res.json();
      if (data.success) {
        setRecords(data.data?.assessments || []);
        setPercentile(data.data?.percentile || null);
        setGrowthData(data.data?.growthCurve || []);
        if (data.data?.assessments?.length > 0) {
          setSelectedIdx(0);
          // 埋点：完成测评（加载到历史数据）
          AnalyticsTracker.track(AnalyticsEvent.ASSESSMENT_COMPLETE, {
            total_records: data.data.assessments.length,
          });
        }
      }
    } catch (err) {
      console.error('获取测评数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const selected = records[selectedIdx];

  // 雷达图 SVG
  const RadarChart = ({ dimensions }: { dimensions: Dimension[] }) => {
    if (!dimensions || dimensions.length === 0) return null;
    const cx = 150, cy = 150, r = 110;
    const n = dimensions.length;
    const angleStep = (2 * Math.PI) / n;

    const getPoint = (i: number, val: number) => {
      const angle = -Math.PI / 2 + i * angleStep;
      const dist = (val / 100) * r;
      return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) };
    };

    const gridLevels = [20, 40, 60, 80, 100];

    return (
      <svg viewBox="0 0 300 300" className="w-full max-w-xs mx-auto">
        {/* 网格线 */}
        {gridLevels.map((level) => (
          <polygon
            key={level}
            points={Array.from({ length: n }, (_, i) => {
              const p = getPoint(i, level);
              return `${p.x},${p.y}`;
            }).join(' ')}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="0.5"
          />
        ))}
        {/* 轴线 */}
        {dimensions.map((_, i) => {
          const p = getPoint(i, 100);
          return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#D1D5DB" strokeWidth="0.5" />;
        })}
        {/* 数据区域 */}
        <polygon
          points={dimensions.map((d, i) => {
            const p = getPoint(i, d.score);
            return `${p.x},${p.y}`;
          }).join(' ')}
          fill="rgba(139, 92, 246, 0.15)"
          stroke="#8B5CF6"
          strokeWidth="2"
        />
        {/* 数据点 */}
        {dimensions.map((d, i) => {
          const p = getPoint(i, d.score);
          return (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="4" fill="#8B5CF6" />
              <text
                x={getPoint(i, 120).x}
                y={getPoint(i, 120).y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[10px] fill-gray-600"
              >
                {d.name}
              </text>
              <text
                x={getPoint(i, 80).x}
                y={getPoint(i, 80).y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[9px] fill-purple-500 font-bold"
              >
                {d.score}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4">
          {/* 页面标题 */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">能力测评</h1>
            </div>
            <p className="text-gray-500 ml-13">全方位评估你的职业能力，发现提升空间</p>
          </div>

          {/* 登录提示卡片 */}
          <Card className="border-purple-100 shadow-xl">
            <CardContent className="py-16 text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Lock className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">登录解锁完整功能</h3>
              <p className="text-gray-500 mb-6">登录后可保存你的测评结果和职业画像，追踪能力成长曲线</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
                <Link href="/auth">
                  <Button className="w-full sm:w-auto px-8 py-6 text-lg bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 shadow-lg">
                    <LogIn className="w-5 h-5 mr-2" />
                    立即登录
                  </Button>
                </Link>
                <Link href="/assistant">
                  <Button variant="outline" className="w-full sm:w-auto px-6 py-6">
                    先体验一下
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
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">能力测评</h1>
          </div>
          <p className="text-gray-500 ml-13">全方位评估你的职业能力，发现提升空间</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-20">
            <Spinner className="w-10 h-10 text-purple-500" />
            <p className="mt-4 text-gray-500">加载测评数据中...</p>
          </div>
        ) : records.length === 0 ? (
          <Card className="border-purple-100">
            <CardContent className="py-16 text-center">
              <Award className="w-16 h-16 text-purple-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">暂无测评记录</h3>
              <p className="text-gray-400 text-sm mb-4">前往AI职业助手，使用能力测评助手完成一次测评</p>
              <Button onClick={() => window.location.href = '/assistant'} className="bg-purple-600 hover:bg-purple-700">
                前往测评 <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左侧：测评历史列表 */}
            <div className="lg:col-span-1 space-y-3">
              <h3 className="text-sm font-medium text-gray-500 flex items-center gap-1">
                <History className="w-4 h-4" /> 测评历史
              </h3>
              {records.slice(0, isMember ? undefined : 1).map((rec, idx) => (
                <Card
                  key={rec.id}
                  className={`cursor-pointer transition-all border ${
                    idx === selectedIdx
                      ? 'border-purple-400 ring-2 ring-purple-100'
                      : 'border-gray-100 hover:border-purple-200'
                  }`}
                  onClick={() => setSelectedIdx(idx)}
                >
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-800">
                          {rec.data.target_position || '综合测评'}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {new Date(rec.createdAt).toLocaleDateString('zh-CN')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${
                          (rec.data.overall_score || 0) >= 80
                            ? 'bg-green-50 text-green-700'
                            : (rec.data.overall_score || 0) >= 60
                              ? 'bg-purple-50 text-purple-700'
                              : 'bg-orange-50 text-orange-700'
                        }`}>
                          {rec.data.overall_score || 0}分
                        </Badge>
                        {idx > 0 && records[idx - 1]?.data?.overall_score !== undefined && rec.data.overall_score !== undefined && (
                          rec.data.overall_score > (records[idx - 1].data.overall_score || 0)
                            ? <ArrowUpRight className="w-4 h-4 text-green-500" />
                            : rec.data.overall_score < (records[idx - 1].data.overall_score || 0)
                              ? <ArrowDownRight className="w-4 h-4 text-red-400" />
                              : <Minus className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* 右侧：测评详情 */}
            <div className="lg:col-span-2 space-y-6">
              {/* 竞争力百分位 */}
              {percentile && (
                <Card className="border-purple-100 overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-purple-400 to-violet-600" />
                  <CardContent className="py-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-purple-700 flex items-center gap-1">
                          <TrendingUp className="w-4 h-4" /> 竞争力百分位
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">
                          在 {percentile.totalUsers} 位同岗位测评者中排名第 {percentile.userRank}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-purple-600">
                          Top {percentile.percentileRank}%
                        </div>
                      </div>
                    </div>
                    {/* 百分位进度条 */}
                    <div className="mt-3 h-3 bg-purple-50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-400 to-violet-600 rounded-full transition-all duration-700"
                        style={{ width: `${percentile.percentileRank}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 雷达图 */}
              {selected?.data?.dimensions && selected.data.dimensions.length > 0 && (
                <Card className="border-purple-100">
                  <CardHeader>
                    <CardTitle className="text-purple-700">能力雷达图</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RadarChart dimensions={selected.data.dimensions} />
                    {/* 维度详情 */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
                      {selected.data.dimensions.map((dim, i) => (
                        <div key={i} className="bg-purple-50 rounded-lg p-3">
                          <div className="text-xs text-gray-500">{dim.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-lg font-bold text-purple-700">{dim.score}</span>
                            <Badge className={`text-xs ${
                              dim.level === '良好' || dim.level === '优秀'
                                ? 'bg-green-50 text-green-700'
                                : dim.level === '达标'
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-orange-50 text-orange-700'
                            }`}>
                              {dim.level}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">超过 {dim.percentile}% 的人</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 技能缺口 */}
              {selected?.data?.gap_skills && selected.data.gap_skills.length > 0 && (
                <Card className="border-orange-100">
                  <CardHeader>
                    <CardTitle className="text-orange-700 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" /> 待提升技能
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {selected.data.gap_skills.map((skill, i) => (
                        <Badge key={i} className="bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-50">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* SkillAssessmentCard 复用 */}
              {selected && (
                <SkillAssessmentCard
                  data={{
                    skills: selected.data.dimensions?.map((d) => ({
                      name: d.name,
                      score: d.score,
                      max_score: 100,
                      level: d.level,
                    })) || [],
                    overall_level: selected.data.grade,
                    weaknesses: selected.data.gap_skills,
                  }}
                />
              )}

              {/* 成长曲线 - 仅会员 */}
              {isMember && growthData.length >= 2 && (
                <Card className="border-purple-100">
                  <CardHeader>
                    <CardTitle className="text-purple-700 flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" /> 成长曲线
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-2 h-40">
                      {growthData.map((point, i) => {
                        const heightPct = Math.max((point.score / 100) * 100, 5);
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center">
                            <div className="text-xs text-purple-600 font-medium mb-1">{point.score}</div>
                            <div
                              className="w-full bg-gradient-to-t from-purple-400 to-violet-500 rounded-t-md transition-all duration-500"
                              style={{ height: `${heightPct}%` }}
                            />
                            <div className="text-xs text-gray-400 mt-1 truncate max-w-full">
                              {new Date(point.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 免费用户：历史对比锁定 */}
              {!isMember && !memberLoading && records.length > 1 && (
                <Card className="border-amber-100 bg-gradient-to-br from-amber-50/50 to-yellow-50/50">
                  <CardContent className="py-6 text-center">
                    <Crown className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                    <h4 className="font-medium text-gray-700 mb-1">历史对比与成长曲线</h4>
                    <p className="text-sm text-gray-400 mb-3">会员可查看完整测评历史和成长趋势</p>
                    <button
                      onClick={() => setPaywallOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-sm font-medium hover:from-amber-600 hover:to-yellow-600 transition-all"
                    >
                      <Crown className="w-4 h-4" /> 升级会员
                    </button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 付费墙弹窗 */}
      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} feature="完整测评历史" />
    </div>
  );
}
