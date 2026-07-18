'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { RefreshCw,
  Loader2,
  Database,
  TrendingUp,
  AlertCircle,
  ChevronDown,
  ChevronUp } from 'lucide-react';

interface SyncLog {
  id: string;
  source: string;
  fetched_count: number;
  success_count: number;
  fail_count: number;
  status: string;
  error_message: string;
  created_at: string;
}

interface Stats {
  total_syncs: number;
  total_success: number;
  total_fail: number;
  today_syncs: number;
}

const platforms = [
  { id: 'all', name: '全部平台', count: 0 },
  { id: '国家24365就业平台', name: '国家24365就业平台', count: 0 },
  { id: '中国公共招聘网', name: '中国公共招聘网', count: 0 },
  { id: '广西人才网', name: '广西人才网', count: 0 },
  { id: '国聘网', name: '国聘网', count: 0 },
  { id: '中国研究生招聘网', name: '中国研究生招聘网', count: 0 },
  { id: '广西高校毕业生就业网', name: '广西高校毕业生就业网', count: 0 }
];

export default function SyncPage() {
  const { admin } = useAdminAuth();
  
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [stats, setStats] = useState<Stats>({ total_syncs: 0, total_success: 0, total_fail: 0, today_syncs: 0 });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncingPlatform, setSyncingPlatform] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
// eslint-disable-next-line react-hooks/immutability
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/admin/api/sync?page=${page}&pageSize=20`);
      const data = await response.json();
      
      if (data.code === 200) {
        setLogs(data.data.list);
        setStats(data.data.stats);
        setTotal(data.data.pagination.total);
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (platformId: string) => {
    setSyncing(true);
    setSyncingPlatform(platformId);
    
    try {
      const response = await fetch('/admin/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: platformId,
          adminId: admin?.id,
          adminUsername: admin?.username
        })
      });
      
      if (response.ok) {
        fetchData();
      }
    } finally {
      setSyncing(false);
      setSyncingPlatform(null);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('zh-CN');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">同步任务管理</h1>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <RefreshCw className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">总同步次数</p>
                <p className="text-2xl font-bold">{stats.total_syncs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">今日同步</p>
                <p className="text-2xl font-bold">{stats.today_syncs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Database className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">累计成功</p>
                <p className="text-2xl font-bold">{stats.total_success}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">累计失败</p>
                <p className="text-2xl font-bold">{stats.total_fail}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 同步控制区 */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">手动同步</h2>
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={() => handleSync('all')}
              disabled={syncing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {syncing && syncingPlatform === 'all' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              同步全部平台
            </Button>
            
            {platforms.slice(1).map(platform => (
              <Button
                key={platform.id}
                variant="outline"
                onClick={() => handleSync(platform.id)}
                disabled={syncing}
              >
                {syncing && syncingPlatform === platform.id ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                {platform.name}
              </Button>
            ))}
          </div>
          
          {syncing && (
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              正在同步{platforms.find(p => p.id === syncingPlatform)?.name}...
            </div>
          )}
        </CardContent>
      </Card>

      {/* 同步日志列表 */}
      <Card>
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold">同步历史</h2>
            <span className="text-sm text-gray-500">共 {total} 条记录</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">来源平台</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">拉取数量</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">成功</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">失败</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">状态</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">同步时间</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                      暂无同步记录
                    </td>
                  </tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-medium">{log.source}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {log.fetched_count}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-green-600 font-medium">{log.success_count}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={log.fail_count > 0 ? 'text-red-600 font-medium' : 'text-gray-500'}>
                          {log.fail_count}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={log.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                          {log.status === 'completed' ? '成功' : '进行中'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                        >
                          {expandedLog === log.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          {expandedLog === log.id ? '收起' : '详情'}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {total > 20 && (
            <div className="px-4 py-3 border-t flex justify-center">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  上一页
                </Button>
                <span className="px-3 py-1 text-sm">第 {page} 页</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * 20 >= total}
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
