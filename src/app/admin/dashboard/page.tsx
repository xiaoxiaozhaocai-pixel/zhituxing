'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
  Users, 
  Briefcase, 
  Crown, 
  Clock,
  FileSearch,
  RefreshCw,
  FileText,
  TrendingUp,
  AlertCircle,
  Server,
  Shield,
  MessageSquare,
  Settings,
  Activity,
  ChevronRight
} from 'lucide-react';

interface Stats {
  overview: {
    totalUsers: number;
    todayUsers: number;
    totalJobs: number;
    todayJobs: number;
    totalMembers: number;
    pendingJDs: number;
  };
  weekUserData: Array<{ date: string; label: string; users: number }>;
  weekJobData: Array<{ date: string; label: string; jobs: number }>;
  sourceStats: Array<{ source: string; count: number }>;
  reviewStats: { pending: number; approved: number; rejected: number };
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    checkHealth();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/admin/api/stats');
      const data = await response.json();
      if (data.code === 200) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + 'w';
    }
    return num.toLocaleString();
  };

  const maxValue = (arr: Array<{ users?: number; jobs?: number }>, key: 'users' | 'jobs') => {
    return Math.max(...arr.map(item => item[key] || 0), 1);
  };

  // 系统健康状态
  const [health, setHealth] = useState<{ site: boolean | null; api: boolean | null }>({ site: null, api: null });
  const checkHealth = async () => {
    try {
      const siteRes = await fetch('https://zhituxing.tech', { mode: 'no-cors' });
      setHealth(prev => ({ ...prev, site: true }));
    } catch { setHealth(prev => ({ ...prev, site: false })); }
    try {
      const apiRes = await fetch('/api/admin/auth');
      setHealth(prev => ({ ...prev, api: apiRes.ok }));
    } catch { setHealth(prev => ({ ...prev, api: false })); }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">数据看板</h1>
        <Button onClick={fetchStats} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          刷新数据
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">总用户数</p>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(stats?.overview.totalUsers || 0)}</p>
                <p className="text-sm text-green-600 mt-1">今日 +{stats?.overview.todayUsers || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">总JD数</p>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(stats?.overview.totalJobs || 0)}</p>
                <p className="text-sm text-green-600 mt-1">今日 +{stats?.overview.todayJobs || 0}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">会员用户</p>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(stats?.overview.totalMembers || 0)}</p>
                <p className="text-sm text-orange-600 mt-1">累计会员数</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Crown className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Link href="/admin/jd-review">
          <Card className={`border-l-4 border-l-red-500 hover:shadow-lg transition-shadow cursor-pointer ${(stats?.overview.pendingJDs || 0) > 0 ? 'bg-red-50' : ''}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">待审核JD</p>
                  <p className={`text-3xl font-bold ${(stats?.overview.pendingJDs || 0) > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {stats?.overview.pendingJDs || 0}
                  </p>
                  <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    需要处理
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* 系统健康 & 快捷面板 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 系统健康 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Server className="w-4 h-4 text-blue-600" />
              系统健康
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${health.site === null ? 'bg-gray-300' : health.site ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-sm text-gray-700">生产站点</span>
                </div>
                <span className="text-xs text-gray-400">zhituxing.tech</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${health.api === null ? 'bg-gray-300' : health.api ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-sm text-gray-700">API服务</span>
                </div>
                <span className="text-xs text-gray-400">/api/admin/auth</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 快捷入口 */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Shield className="w-4 h-4 text-blue-600" />
              快捷入口
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { href: '/admin/jd', icon: Briefcase, label: 'JD管理', desc: '查看审核' },
                { href: '/admin/users', icon: Users, label: '用户管理', desc: '用户详情' },
                { href: '/admin/content', icon: FileText, label: '内容管理', desc: '干货公告' },
                { href: '/admin/orders', icon: Crown, label: '订单审核', desc: '会员订单' },
                { href: '/admin/feedback', icon: MessageSquare, label: '反馈管理', desc: '用户反馈' },
                { href: '/admin/analytics', icon: TrendingUp, label: '行为看板', desc: '数据分析' },
                { href: '/admin/diagnostics', icon: Activity, label: '网站诊断', desc: '性能检查' },
                { href: '/admin/settings', icon: Settings, label: '系统设置', desc: '配置管理' },
              ].map((item) => (
                <Link key={item.href} href={item.href}>
                  <div className="p-3 bg-gray-50 hover:bg-blue-50 rounded-lg transition cursor-pointer group border border-transparent hover:border-blue-200">
                    <item.icon className="w-5 h-5 text-blue-600 mb-1.5" />
                    <p className="text-sm font-medium text-gray-800 group-hover:text-blue-700">{item.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 用户增长趋势 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              近7日用户增长
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-2 h-40">
              {stats?.weekUserData.map((item, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-gray-100 rounded-t relative" style={{ height: '140px' }}>
                    <div 
                      className="absolute bottom-0 w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t transition-all"
                      style={{ height: `${(item.users / maxValue(stats.weekUserData, 'users')) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{item.label}</span>
                  <span className="text-xs font-medium text-blue-600">{item.users}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* JD增长趋势 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-green-600" />
              近7日JD新增
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-2 h-40">
              {stats?.weekJobData.map((item, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-gray-100 rounded-t relative" style={{ height: '140px' }}>
                    <div 
                      className="absolute bottom-0 w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t transition-all"
                      style={{ height: `${(item.jobs / maxValue(stats.weekJobData, 'jobs')) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{item.label}</span>
                  <span className="text-xs font-medium text-green-600">{item.jobs}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 底部统计 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* JD来源分布 */}
        <Card>
          <CardHeader>
            <CardTitle>JD来源分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.sourceStats.slice(0, 5).map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 truncate flex-1">{item.source}</span>
                  <span className="text-sm font-medium text-gray-900 ml-4">{item.count}</span>
                </div>
              ))}
              {(!stats?.sourceStats || stats.sourceStats.length === 0) && (
                <p className="text-sm text-gray-400 text-center py-4">暂无数据</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 审核统计 */}
        <Card>
          <CardHeader>
            <CardTitle>审核统计</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">待审核</span>
                <span className="text-lg font-bold text-yellow-600">{stats?.reviewStats.pending || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">已通过</span>
                <span className="text-lg font-bold text-green-600">{stats?.reviewStats.approved || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">已拒绝</span>
                <span className="text-lg font-bold text-red-600">{stats?.reviewStats.rejected || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 快捷操作 */}
        <Card>
          <CardHeader>
            <CardTitle>快捷操作</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link href="/admin/jd-review">
                <Button className="w-full justify-start" variant="outline">
                  <FileSearch className="w-4 h-4 mr-2" />
                  审核待处理JD
                  {stats?.overview.pendingJDs && stats.overview.pendingJDs > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {stats.overview.pendingJDs}
                    </span>
                  )}
                </Button>
              </Link>
              <Link href="/admin/sync">
                <Button className="w-full justify-start" variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  手动同步JD
                </Button>
              </Link>
              <Link href="/admin/articles/new">
                <Button className="w-full justify-start" variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  新增求职干货
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
