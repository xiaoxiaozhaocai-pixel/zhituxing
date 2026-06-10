'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, AlertTriangle, Briefcase, Lightbulb, RefreshCw,
  Loader2
} from 'lucide-react';

interface CardData {
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
  insight: string;
}

interface DashboardData {
  cards: {
    trend: CardData;
    highRisk: CardData;
    opportunities: CardData;
    suggestions: CardData;
  };
}

export default function AIDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/dashboard/ai-insights');
      const json = await res.json();
      if (json.code === 200) {
        setData(json.data);
      } else {
        setError(json.message || '获取数据失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-500">加载数据中...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={fetchData} variant="outline">重试</Button>
      </div>
    );
  }

  const cards = data?.cards;

  return (
    <div className="space-y-6">
      {/* 顶栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI 数据大屏</h1>
          <p className="text-sm text-gray-500 mt-1">描述性分析 · 基于平台实时数据生成</p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          刷新数据
        </Button>
      </div>

      {/* 4 AI 卡片 (2×2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: 本月趋势解读 */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              {cards?.trend.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-700">{cards?.trend.data.totalUsers || 0}</p>
                <p className="text-xs text-gray-500 mt-1">总用户</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-700">+{cards?.trend.data.monthNewUsers || 0}</p>
                <p className="text-xs text-gray-500 mt-1">本月新增</p>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-700">{cards?.trend.data.monthNewJds || 0}</p>
                <p className="text-xs text-gray-500 mt-1">本月新JD</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-700 leading-relaxed">{cards?.trend.insight}</p>
            </div>
            <div className="mt-3 flex gap-2 text-xs text-gray-400">
              <span>面试: {cards?.trend.data.monthInterviews || 0}次</span>
              <span>·</span>
              <span>评估: {cards?.trend.data.monthAssessments || 0}次</span>
              <span>·</span>
              <span>会员: {cards?.trend.data.memberCount || 0}人</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: 重点群体识别 */}
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              {cards?.highRisk.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-700">{cards?.highRisk.data.totalUsers || 0}</p>
                <p className="text-xs text-gray-500 mt-1">平台总用户</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-700">{cards?.highRisk.data.lowActivityUsers || 0}</p>
                <p className="text-xs text-gray-500 mt-1">低活跃用户</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-700 leading-relaxed">{cards?.highRisk.insight}</p>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              ⚠️ 重点群体识别功能需行为埋点完善后启用
            </p>
          </CardContent>
        </Card>

        {/* Card 3: 岗位机会推荐 */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Briefcase className="w-5 h-5 text-green-600" />
              {cards?.opportunities.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="text-center p-3 bg-green-50 rounded-lg mb-3">
                <p className="text-2xl font-bold text-green-700">{cards?.opportunities.data.totalJdsThisMonth || 0}</p>
                <p className="text-xs text-gray-500 mt-1">本月新增岗位</p>
              </div>
              {cards?.opportunities.data.topCompanies?.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 font-medium">活跃雇主 TOP10：</p>
                  {cards!.opportunities.data.topCompanies.map((c: { name: string; count: number }, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 truncate flex-1">{i + 1}. {c.name}</span>
                      <span className="text-gray-500 ml-2">{c.count}条</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">暂无活跃雇主数据</p>
              )}
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-700 leading-relaxed">{cards?.opportunities.insight}</p>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: 老师待办建议 */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="w-5 h-5 text-purple-600" />
              {cards?.suggestions.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-700">{cards?.suggestions.data.pendingJds || 0}</p>
                <p className="text-xs text-gray-500 mt-1">待审核JD</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-700">{cards?.suggestions.data.monthNewUsers || 0}</p>
                <p className="text-xs text-gray-500 mt-1">本月新用户</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-700 leading-relaxed">{cards?.suggestions.insight}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 底部提示 */}
      <div className="text-center text-xs text-gray-400 pt-4 border-t">
        数据来源：Supabase 实时查询 · AI 洞察基于 DeepSeek 生成 · 大屏 v1 描述性分析阶段
      </div>
    </div>
  );
}
