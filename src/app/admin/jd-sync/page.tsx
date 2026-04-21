'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { 
  RefreshCw, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertCircle,
  Database,
  ExternalLink,
  Calendar,
  TrendingUp
} from 'lucide-react';

// 同步日志接口
interface SyncLog {
  id: number;
  sync_time: string;
  source_platform: string;
  total_fetched: number;
  success_count: number;
  fail_count: number;
  fail_reason: string | null;
}

// 同步统计接口
interface SyncStats {
  total_jobs: number;
  today_sync: number;
  last_sync_time: string | null;
}

export default function JdSyncPage() {
  const { user, loading: authLoading } = useAuth();
  
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 获取同步统计
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/jobs');
      const data = await response.json();
      
      const today = new Date().toISOString().slice(0, 10);
      
      // 从 jobs 表获取总数据
      const totalJobs = data.data?.total || 0;
      
      // 从同步日志获取今日同步数
      const todaySync = logs.filter(log => 
        log.sync_time && log.sync_time.slice(0, 10) === today
      ).reduce((sum, log) => sum + log.success_count, 0);
      
      const lastLog = logs[0];
      
      setStats({
        total_jobs: totalJobs,
        today_sync: todaySync,
        last_sync_time: lastLog?.sync_time || null
      });
    } catch (error) {
      console.error('获取统计失败:', error);
    }
  };

  // 获取同步日志
  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/admin/jd-sync/logs');
      const data = await response.json();
      
      if (data.code === 200) {
        setLogs(data.data?.list || []);
      }
    } catch (error) {
      console.error('获取日志失败:', error);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      Promise.all([fetchLogs()]).finally(() => setLoading(false));
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (logs.length > 0) {
      fetchStats();
    }
  }, [logs]);

  // 手动触发同步
  const handleManualSync = async (useMock: boolean = false) => {
    if (!user) return;
    
    setSyncing(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const response = await fetch('/api/jd-sync/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ useMock })
      });
      
      const data = await response.json();
      
      if (data.code === 200) {
        const { summary } = data.data;
        setSuccessMessage(`同步完成！共拉取 ${summary.total_fetched} 条，成功导入 ${summary.success_count} 条`);
        
        // 刷新日志列表
        await fetchLogs();
        await fetchStats();
      } else {
        setError(data.message || '同步失败');
      }
    } catch (error) {
      console.error('同步失败:', error);
      setError('网络错误，请稍后重试');
    } finally {
      setSyncing(false);
    }
  };

  // 格式化时间
  const formatTime = (time: string | null) => {
    if (!time) return '从未同步';
    const date = new Date(time);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 获取平台徽章颜色
  const getPlatformBadge = (platform: string) => {
    if (platform.includes('24365')) return 'bg-blue-100 text-blue-700';
    if (platform.includes('公共招聘')) return 'bg-green-100 text-green-700';
    if (platform.includes('广西')) return 'bg-orange-100 text-orange-700';
    return 'bg-gray-100 text-gray-700';
  };

  // 非管理员拦截
  if (!authLoading && user && user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="text-center py-12">
            <CardContent>
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">权限不足</h2>
              <p className="text-gray-500">只有管理员才能访问此页面</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">JD同步管理</h1>
          <p className="text-gray-500 mt-1">管理官方公开招聘API数据同步</p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">岗位总数</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.total_jobs || 0}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Database className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">今日同步</p>
                  <p className="text-2xl font-bold text-green-600">{stats?.today_sync || 0}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">上次同步</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatTime(stats?.last_sync_time || null)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 操作区域 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              同步控制
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Button 
                  onClick={() => handleManualSync(false)}
                  disabled={syncing || loading}
                  className="bg-[#165DFF] hover:bg-[#165DFF]/90"
                >
                  {syncing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      同步中...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      同步官方API
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={() => handleManualSync(true)}
                  disabled={syncing || loading}
                  variant="outline"
                >
                  <Database className="w-4 h-4 mr-2" />
                  使用模拟数据
                </Button>
                
                <span className="text-sm text-gray-500">
                  （官方API不可用时可使用模拟数据演示）
                </span>
              </div>
              
              <div className="text-sm text-gray-500 bg-blue-50 p-3 rounded-lg">
                <p>提示：由于部分官方API地址可能已变更，如果官方API同步失败，可以点击&quot;使用模拟数据&quot;按钮添加演示数据。</p>
              </div>
            </div>
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}
            
            {successMessage && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-700">{successMessage}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 同步日志 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              同步日志
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">暂无同步记录</p>
                <p className="text-sm text-gray-400 mt-1">点击&quot;立即同步&quot;开始同步官方招聘数据</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">同步时间</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">来源平台</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">拉取数</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">成功</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">失败</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {formatTime(log.sync_time)}
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={getPlatformBadge(log.source_platform)}>
                            {log.source_platform}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center text-sm text-gray-900">
                          {log.total_fetched}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-sm font-medium text-green-600">
                            {log.success_count}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`text-sm font-medium ${log.fail_count > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                            {log.fail_count}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {log.fail_count > 0 || log.fail_reason ? (
                            <div className="flex items-center gap-1 text-red-500">
                              <XCircle className="w-4 h-4" />
                              <span className="text-xs">{log.fail_reason || '部分失败'}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-green-500">
                              <CheckCircle className="w-4 h-4" />
                              <span className="text-xs">成功</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 数据来源说明 */}
        <Card className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-gray-900 mb-3">官方数据来源</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">国家24365就业平台</p>
                  <p className="text-gray-500">教育部官方，提供全国校招岗位</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">中国公共招聘网</p>
                  <p className="text-gray-500">人社部官方，提供国企/事业单位岗位</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">广西人才网上</p>
                  <p className="text-gray-500">广西人社厅官方，提供区域精准岗位</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
