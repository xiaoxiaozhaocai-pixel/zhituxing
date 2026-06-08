'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { RefreshCw, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertCircle,
  Database,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Play } from 'lucide-react';

// 平台配置
const PLATFORMS = [
  { id: 'ncss', name: '国家24365就业平台', color: 'bg-blue-500', pages: 10 },
  { id: 'mohrss', name: '中国公共招聘网', color: 'bg-green-500', pages: 10 },
  { id: 'gxrc', name: '广西人才网上', color: 'bg-orange-500', pages: 10 },
  { id: 'iguopin', name: '国聘网', color: 'bg-red-500', pages: 10 },
  { id: 'chinahr', name: '中国研究生招聘网', color: 'bg-purple-500', pages: 10 },
  { id: 'gxedu', name: '广西高校毕业生就业网', color: 'bg-teal-500', pages: 5 }
];

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
interface JobsStats {
  total: number;
  today: number;
  bySource: Record<string, number>;
}

// 同步进度
interface SyncProgress {
  platform: string;
  current: number;
  total: number;
  status: 'pending' | 'syncing' | 'completed' | 'error';
}

export default function JdSyncPage() {
  const { user, loading: authLoading } = useAuth();
  
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [stats, setStats] = useState<JobsStats | null>(null);
  const [_loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncingPlatform, setSyncingPlatform] = useState<string | null>(null);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());

  // 获取统计数据
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/jd-sync/sync');
      const data = await response.json();
      
      if (data.code === 200) {
        setStats(data.data.jobs_stats);
      }
    } catch (error) {
      console.error('获取统计失败:', error);
    }
  }, []);

  // 获取同步日志
  const fetchLogs = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/jd-sync/logs?pageSize=50');
      const data = await response.json();
      
      if (data.code === 200) {
        setLogs(data.data.list || []);
      }
    } catch (error) {
      console.error('获取日志失败:', error);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      Promise.all([fetchLogs(), fetchStats()]).finally(() => setLoading(false));
    }
  }, [user, authLoading, fetchLogs, fetchStats]);

  // 全量同步
  const handleFullSync = async (useMock: boolean = false) => {
    if (!user) return;
    
    setSyncing(true);
    setProgress({ platform: '全量同步', current: 0, total: PLATFORMS.length, status: 'syncing' });
    
    try {
      const response = await fetch('/api/jd-sync/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useMock })
      });
      
      const data = await response.json();
      
      if (data.code === 200) {
        setProgress({ platform: '全量同步', current: PLATFORMS.length, total: PLATFORMS.length, status: 'completed' });
        
        // 刷新数据
        await fetchLogs();
        await fetchStats();
        
        setTimeout(() => setProgress(null), 3000);
      } else {
        setProgress({ platform: '全量同步', current: 0, total: PLATFORMS.length, status: 'error' });
        setTimeout(() => setProgress(null), 3000);
      }
    } catch (error) {
      console.error('同步失败:', error);
      setProgress({ platform: '全量同步', current: 0, total: PLATFORMS.length, status: 'error' });
      setTimeout(() => setProgress(null), 3000);
    } finally {
      setSyncing(false);
    }
  };

  // 单平台同步
  const handleSingleSync = async (platformId: string) => {
    if (!user) return;
    
    setSyncingPlatform(platformId);
    setProgress({ platform: platformId, current: 0, total: 1, status: 'syncing' });
    
    try {
      const response = await fetch('/api/admin/jd-sync/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: platformId })
      });
      
      const data = await response.json();
      
      if (data.code === 200) {
        setProgress({ platform: platformId, current: 1, total: 1, status: 'completed' });
        
        // 刷新数据
        await fetchLogs();
        await fetchStats();
        
        setTimeout(() => setProgress(null), 2000);
      } else {
        setProgress({ platform: platformId, current: 0, total: 1, status: 'error' });
        setTimeout(() => setProgress(null), 2000);
      }
    } catch (error) {
      console.error('同步失败:', error);
      setProgress({ platform: platformId, current: 0, total: 1, status: 'error' });
      setTimeout(() => setProgress(null), 2000);
    } finally {
      setSyncingPlatform(null);
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

  // 获取平台信息
  const getPlatformInfo = (name: string) => {
    return PLATFORMS.find(p => name.includes(p.name.slice(0, 4))) || { 
      id: 'unknown', 
      name: name, 
      color: 'bg-gray-500',
      pages: 0 
    };
  };

  // 非管理员拦截
  if (!authLoading && user && user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
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
          <p className="text-gray-500 mt-1">管理6大官方招聘API数据同步，目标：5000+条真实校招岗位</p>
        </div>

        {/* 同步进度条 */}
        {progress && (
          <Card className="mb-8 border-2 border-[#165DFF]/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {progress.status === 'syncing' && <Loader2 className="w-5 h-5 animate-spin text-[#165DFF]" />}
                  {progress.status === 'completed' && <CheckCircle className="w-5 h-5 text-green-500" />}
                  {progress.status === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
                  <span className="font-medium text-gray-900">
                    {progress.status === 'syncing' && `正在同步: ${progress.platform}`}
                    {progress.status === 'completed' && '同步完成'}
                    {progress.status === 'error' && '同步失败'}
                  </span>
                </div>
                <Badge variant={progress.status === 'syncing' ? 'default' : progress.status === 'completed' ? 'secondary' : 'destructive'}>
                  {progress.status === 'syncing' && '进行中'}
                  {progress.status === 'completed' && '已完成'}
                  {progress.status === 'error' && '失败'}
                </Badge>
              </div>
              <Progress value={(progress.current / progress.total) * 100} className="h-2" />
              <p className="text-sm text-gray-500 mt-2">
                {progress.current} / {progress.total}
              </p>
            </CardContent>
          </Card>
        )}

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">岗位总数</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.total || 0}</p>
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
                  <p className="text-sm text-gray-500">今日新增</p>
                  <p className="text-2xl font-bold text-green-600">+{stats?.today || 0}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">最近同步</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {logs[0] ? formatTime(logs[0].sync_time) : '从未同步'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">目标进度</p>
                  <p className="text-2xl font-bold text-[#165DFF]">
                    {Math.round(((stats?.total || 0) / 5000) * 100)}%
                  </p>
                </div>
                <div className="w-12 h-12 bg-[#165DFF]/10 rounded-full flex items-center justify-center">
                  <Play className="w-6 h-6 text-[#165DFF]" />
                </div>
              </div>
              <Progress value={((stats?.total || 0) / 5000) * 100} className="h-1 mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Tab切换 */}
        <Tabs defaultValue="sync" className="mb-8">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sync">同步控制</TabsTrigger>
            <TabsTrigger value="platforms">平台统计</TabsTrigger>
            <TabsTrigger value="logs">同步日志</TabsTrigger>
          </TabsList>

          {/* 同步控制Tab */}
          <TabsContent value="sync">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5" />
                  全量同步
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  点击下方按钮，从6大官方招聘平台同步校招岗位数据。每次同步将拉取每个平台最近发布的新岗位。
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button 
                    onClick={() => handleFullSync(false)}
                    disabled={syncing}
                    className="bg-[#165DFF] hover:bg-[#165DFF]/90"
                  >
                    {syncing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    同步全部平台
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => handleFullSync(true)}
                    disabled={syncing}
                  >
                    <Loader2 className="w-4 h-4 mr-2" />
                    使用演示数据
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 单平台控制 */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>单平台同步</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {PLATFORMS.map(platform => (
                    <div 
                      key={platform.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${platform.color}`} />
                          <span className="font-medium text-gray-900">{platform.name}</span>
                        </div>
                        <Badge variant="outline">
                          {stats?.bySource?.[platform.name] || 0} 条
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 mb-3">
                        预计获取: ~{platform.pages * 100} 条
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => handleSingleSync(platform.id)}
                        disabled={syncingPlatform === platform.id || syncing}
                      >
                        {syncingPlatform === platform.id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4 mr-2" />
                        )}
                        立即同步
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 平台统计Tab */}
          <TabsContent value="platforms">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  各平台数据统计
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {PLATFORMS.map(platform => {
                    const count = stats?.bySource?.[platform.name] || 0;
                    const percentage = stats?.total ? Math.round((count / stats.total) * 100) : 0;
                    
                    return (
                      <div key={platform.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${platform.color}`} />
                            <span className="font-medium text-gray-900">{platform.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-500">{count} 条</span>
                            <span className="text-sm font-medium text-gray-900">{percentage}%</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div 
                            className={`${platform.color} h-2 rounded-full transition-all`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {(!stats?.bySource || Object.keys(stats.bySource).length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    <Database className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>暂无数据，请先执行同步任务</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 同步日志Tab */}
          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  同步日志
                </CardTitle>
              </CardHeader>
              <CardContent>
                {logs.length > 0 ? (
                  <div className="space-y-3">
                    {logs.map(log => {
                      const platform = getPlatformInfo(log.source_platform);
                      const isExpanded = expandedLogs.has(log.id);
                      
                      return (
                        <div 
                          key={log.id}
                          className="border rounded-lg overflow-hidden"
                        >
                          <div 
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                            onClick={() => {
                              const newExpanded = new Set(expandedLogs);
                              if (newExpanded.has(log.id)) {
                                newExpanded.delete(log.id);
                              } else {
                                newExpanded.add(log.id);
                              }
                              setExpandedLogs(newExpanded);
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${platform.color}`} />
                              <div>
                                <p className="font-medium text-gray-900">{log.source_platform}</p>
                                <p className="text-sm text-gray-500">{formatTime(log.sync_time)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-4 text-sm">
                                <span className="text-green-600">
                                  <CheckCircle className="w-4 h-4 inline mr-1" />
                                  {log.success_count} 成功
                                </span>
                                <span className="text-red-600">
                                  <XCircle className="w-4 h-4 inline mr-1" />
                                  {log.fail_count} 失败
                                </span>
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-gray-400" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                          </div>
                          
                          {isExpanded && (
                            <div className="border-t p-4 bg-gray-50">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-500">总计获取</p>
                                  <p className="font-medium">{log.total_fetched} 条</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">成功导入</p>
                                  <p className="font-medium text-green-600">{log.success_count} 条</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">重复/失败</p>
                                  <p className="font-medium text-red-600">{log.fail_count} 条</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">成功率</p>
                                  <p className="font-medium">
                                    {log.total_fetched > 0 
                                      ? `${Math.round((log.success_count / log.total_fetched) * 100)}%`
                                      : '-'}
                                  </p>
                                </div>
                              </div>
                              {log.fail_reason && (
                                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                                  <p className="text-sm text-red-700">
                                    <AlertCircle className="w-4 h-4 inline mr-1" />
                                    失败原因: {log.fail_reason}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>暂无同步日志</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* API说明 */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <h3 className="font-bold text-blue-900 mb-3">支持的官方招聘平台</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
              {PLATFORMS.map(platform => (
                <div key={platform.id} className="flex items-center gap-2 text-blue-800">
                  <div className={`w-2 h-2 rounded-full ${platform.color}`} />
                  {platform.name}
                </div>
              ))}
            </div>
            <p className="text-blue-700 text-sm mt-4">
              数据来源：国家24365就业平台（教育部）、中国公共招聘网（人社部）、国聘网（央企国企）、广西人才网上、广西高校毕业生就业网等官方公开招聘API。所有数据均为真实校招岗位，每周自动更新。
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
