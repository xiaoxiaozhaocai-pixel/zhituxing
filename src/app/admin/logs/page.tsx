'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2,
  Filter,
  Clock,
  User } from 'lucide-react';

interface LogItem {
  id: string;
  admin_id: number;
  admin_username: string;
  operation_type: string;
  operation_content: string;
  ip_address: string;
  created_at: string;
}

const operationTypeLabels: Record<string, string> = {
  login: '登录',
  logout: '退出',
  jd_review_pass: 'JD审核通过',
  jd_review_reject: 'JD审核拒绝',
  jd_create: '新增JD',
  jd_update: '更新JD',
  jd_delete: '删除JD',
  member_manage: '会员管理',
  content_create: '创建内容',
  content_update: '更新内容',
  content_delete: '删除内容',
  sync_trigger: '触发同步',
  settings_update: '更新设置'
};

const operationTypeColors: Record<string, string> = {
  login: 'bg-blue-100 text-blue-700',
  logout: 'bg-gray-100 text-gray-700',
  jd_review_pass: 'bg-green-100 text-green-700',
  jd_review_reject: 'bg-red-100 text-red-700',
  jd_create: 'bg-purple-100 text-purple-700',
  jd_update: 'bg-orange-100 text-orange-700',
  jd_delete: 'bg-red-100 text-red-700',
  member_manage: 'bg-yellow-100 text-yellow-700',
  content_create: 'bg-indigo-100 text-indigo-700',
  content_update: 'bg-cyan-100 text-cyan-700',
  content_delete: 'bg-pink-100 text-pink-700',
  sync_trigger: 'bg-teal-100 text-teal-700',
  settings_update: 'bg-violet-100 text-violet-700'
};

export default function LogsPage() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  
  const [filters, setFilters] = useState({
    type: '',
    keyword: '',
    startDate: '',
    endDate: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
// eslint-disable-next-line
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '20',
        ...(filters.type && { type: filters.type })
      });
      
      const response = await fetch(`/admin/api/logs?${params}`);
      const data = await response.json();
      
      if (data.code === 200) {
        setLogs(data.data.list);
        setTypes(data.data.types);
        setTotal(data.data.pagination.total);
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchData();
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('zh-CN');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">操作日志</h1>
        
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4 mr-2" />
          {showFilters ? '收起筛选' : '筛选'}
        </Button>
      </div>

      {/* 筛选区 */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">操作类型</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  <option value="">全部</option>
                  {types.map(type => (
                    <option key={type} value={type}>
                      {operationTypeLabels[type] || type}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">关键词</label>
                <Input
                  value={filters.keyword}
                  onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
                  placeholder="搜索操作内容"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">开始日期</label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">结束日期</label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
              <Button onClick={handleSearch}>搜索</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 日志列表 */}
      <Card>
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <span className="text-sm text-gray-500">共 {total} 条记录</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">操作人</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">操作类型</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">操作内容</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">IP地址</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">操作时间</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-600" />
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                      暂无日志记录
                    </td>
                  </tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{log.admin_username || '系统'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={operationTypeColors[log.operation_type] || 'bg-gray-100 text-gray-700'}>
                          {operationTypeLabels[log.operation_type] || log.operation_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm max-w-md truncate">
                        {log.operation_content}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {log.ip_address || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {formatDate(log.created_at)}
                        </div>
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
