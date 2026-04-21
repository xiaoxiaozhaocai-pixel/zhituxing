'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { 
  Sparkles, 
  Loader2, 
  AlertCircle,
  Download,
  Share2,
  ChevronDown,
  ChevronUp,
  Briefcase,
  GraduationCap,
  MapPin,
  TrendingUp,
  Calendar,
  ArrowLeft,
  Target,
  BookOpen,
  MessageSquare
} from 'lucide-react';

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

export default function ReportPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
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
      fetchReport();
    }
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

  const togglePanel = (panel: string) => {
    setExpandedPanels(prev => ({
      ...prev,
      [panel]: !prev[panel]
    }));
  };

  // 格式化日期
  const formatDate = (dateStr: string) => {
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
            <h2 className="text-xl font-semibold text-gray-900 mb-2">获取报告失败</h2>
            <p className="text-gray-500 mb-6">{error || '报告不存在'}</p>
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
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/career-planning/my-reports" className="text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">我的职业规划报告</h1>
            {report.is_latest === 1 && (
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">最新</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
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
        <Card className="mb-6 bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-700">
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
                      <h3 className="font-semibold text-gray-900">{job.name}</h3>
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-sm font-medium rounded-full">
                        {job.match_score}%匹配
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
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
                    <Button variant="outline" size="sm" className="w-full mt-3 text-purple-700 border-purple-300 hover:bg-purple-50">
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
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  6维诊断模型
                </CardTitle>
                {expandedPanels.dimensions ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </CardHeader>
            {expandedPanels.dimensions && (
              <CardContent className="pb-6">
                {/* 雷达图占位容器 */}
                <div className="border-2 border-dashed border-purple-200 rounded-xl bg-purple-50/50 h-80 flex items-center justify-center">
                  <div className="text-center">
                    <Sparkles className="w-12 h-12 text-purple-300 mx-auto mb-2" />
                    <p className="text-purple-500">6维诊断雷达图</p>
                    <p className="text-sm text-gray-400 mt-1">
                      人格{report.dimensions.personality}% | 专业{report.dimensions.major}% | 能力{report.dimensions.ability}% | 兴趣{report.dimensions.interest}% | 价值观{report.dimensions.values}% | 风险{report.dimensions.risk}%
                    </p>
                  </div>
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
                  <TrendingUp className="w-5 h-5 text-indigo-500" />
                  职业发展路径
                </CardTitle>
                {expandedPanels.careerPath ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </CardHeader>
            {expandedPanels.careerPath && (
              <CardContent className="pb-6">
                {/* 时间线占位容器 */}
                <div className="border-2 border-dashed border-indigo-200 rounded-xl bg-indigo-50/50 p-6">
                  <div className="space-y-4">
                    {report.career_path.map((item, index) => (
                      <div key={index} className="flex items-start gap-4">
                        <div className="w-24 flex-shrink-0">
                          <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-sm rounded font-medium">
                            {item.stage}
                          </span>
                        </div>
                        <div className="flex-1 pb-4 border-b border-indigo-100 last:border-0 last:pb-0">
                          <p className="text-gray-700">{item.action}</p>
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
                  <BookOpen className="w-5 h-5 text-blue-500" />
                  技能缺口分析
                </CardTitle>
                {expandedPanels.skillsGap ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </CardHeader>
            {expandedPanels.skillsGap && (
              <CardContent className="pb-6">
                {/* 对比图占位容器 */}
                <div className="border-2 border-dashed border-blue-200 rounded-xl bg-blue-50/50 p-6">
                  <div className="space-y-4">
                    {report.skills_gap.map((item, index) => (
                      <div key={index}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-700">{item.skill}</span>
                          <span className="text-sm text-gray-500">
                            当前{item.current}% → 目标{item.target}%
                          </span>
                        </div>
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all"
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
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
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
                          <th className="text-left py-2 px-3 font-medium text-gray-700">月份</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-700">任务</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-700">状态</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.action_plan.map((item, index) => (
                          <tr key={index} className="border-b border-green-100 last:border-0">
                            <td className="py-3 px-3 text-gray-600">{item.month}</td>
                            <td className="py-3 px-3 text-gray-700">{item.task}</td>
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

        {/* 行动按钮区 - 固定底部 */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-4 px-4 z-10">
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
