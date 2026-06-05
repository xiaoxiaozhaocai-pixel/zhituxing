'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import {
  Trash2,
  Loader2,
  RotateCcw,
  XCircle,
  Clock,
  AlertTriangle,
  Database,
  FileText,
  Bell
} from 'lucide-react';

interface RecycleItem {
  id: string;
  original_table: string;
  original_id: number;
  deleted_data: unknown;
  deleted_by: string;
  reason: string;
  deleted_at: string;
  expire_at: string;
}

const tableIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  jobs: Database,
  articles: FileText,
  announcements: Bell
};

const tableLabels: Record<string, string> = {
  jobs: 'JD',
  articles: '文章',
  announcements: '公告'
};

export default function RecyclePage() {
  const { admin } = useAdminAuth();
  
  const [items, setItems] = useState<RecycleItem[]>([]);
  const [stats, setStats] = useState({ total: 0, expiringSoon: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [tableFilter, setTableFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ show: boolean; id: string; action: string; item: RecycleItem } | null>(null);

  useEffect(() => {
    fetchData();
  }, [page, tableFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/admin/api/recycle?page=${page}&pageSize=20&tableType=${tableFilter}`);
      const data = await response.json();
      
      if (data.code === 200) {
        setItems(data.data.list);
        setStats(data.data.stats);
        setTotal(data.data.pagination.total);
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!confirmModal) return;
    
    setActionLoading(confirmModal.id);
    try {
      const response = await fetch('/admin/api/recycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: confirmModal.id,
          action: confirmModal.action,
          adminId: admin?.id,
          adminUsername: admin?.username
        })
      });
      
      if (response.ok) {
        setConfirmModal(null);
        fetchData();
      }
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('zh-CN');
  };

  const getExpireTime = (expireAt: string) => {
    const expire = new Date(expireAt);
    const now = new Date();
    const diff = expire.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 24) {
      return `${hours}小时后过期`;
    }
    const days = Math.floor(hours / 24);
    return `${days}天后过期`;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">回收站</h1>

      {/* 告警提示 */}
      {stats.expiringSoon > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
          <span className="text-yellow-700">
            有 <strong>{stats.expiringSoon}</strong> 条内容即将在24小时内自动永久删除
          </span>
        </div>
      )}

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Trash2 className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">回收站总数</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">即将过期</p>
                <p className="text-2xl font-bold text-orange-600">{stats.expiringSoon}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">保留期限</p>
                <p className="text-lg font-medium">7天后自动删除</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 筛选 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            {['all', 'jobs', 'articles', 'announcements'].map(type => {
              const Icon = tableIcons[type] || Trash2;
              return (
                <Button
                  key={type}
                  variant={tableFilter === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setTableFilter(type); setPage(1); }}
                >
                  {type === 'all' ? (
                    '全部'
                  ) : (
                    <>
                      <Icon className="w-4 h-4 mr-1" />
                      {tableLabels[type]}
                    </>
                  )}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 回收站列表 */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">类型</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">内容预览</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">删除人</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">删除时间</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">过期时间</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-600" />
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                      回收站为空
                    </td>
                  </tr>
                ) : (
                  items.map(item => {
                    const Icon = tableIcons[item.original_table] || Trash2;
                    const data = typeof item.deleted_data === 'string' ? JSON.parse(item.deleted_data) : item.deleted_data;
                    const title = data?.title || data?.job_name || `ID: ${item.original_id}`;
                    const isExpiringSoon = new Date(item.expire_at).getTime() - Date.now() < 24 * 60 * 60 * 1000;
                    
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Badge className="bg-gray-100 text-gray-700">
                            <Icon className="w-3 h-3 mr-1" />
                            {tableLabels[item.original_table] || item.original_table}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium max-w-[300px] truncate">{title}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {item.deleted_by || '系统'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {formatDate(item.deleted_at)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm ${isExpiringSoon ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                            {getExpireTime(item.expire_at)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600"
                              onClick={() => setConfirmModal({ show: true, id: item.id, action: 'restore', item })}
                              disabled={actionLoading === item.id}
                            >
                              <RotateCcw className="w-4 h-4 mr-1" />
                              恢复
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600"
                              onClick={() => setConfirmModal({ show: true, id: item.id, action: 'permanent_delete', item })}
                              disabled={actionLoading === item.id}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              删除
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {total > 20 && (
            <div className="px-4 py-3 border-t flex justify-center">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  上一页
                </Button>
                <span className="px-3 py-1 text-sm">第 {page} 页</span>
                <Button size="sm" variant="outline" onClick={() => setPage(p => p + 1)} disabled={page * 20 >= total}>
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 确认弹窗 */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {confirmModal.action === 'restore' ? '确认恢复' : '确认永久删除'}
              </h2>
              <p className="text-gray-600 mb-2">
                {confirmModal.action === 'restore' 
                  ? '确定要恢复这条内容吗？恢复后内容将回到原来的位置。'
                  : '确定要永久删除这条内容吗？此操作不可撤销！'}
              </p>
              <p className="text-sm text-gray-500 mb-6">
                类型: {tableLabels[confirmModal.item.original_table]} | ID: {confirmModal.item.original_id}
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirmModal(null)}>
                  取消
                </Button>
                <Button 
                  variant={confirmModal.action === 'restore' ? 'default' : 'destructive'}
                  onClick={handleAction}
                >
                  {confirmModal.action === 'restore' ? '确认恢复' : '永久删除'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
