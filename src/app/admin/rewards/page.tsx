'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Gift,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Plus,
  User,
  X } from 'lucide-react';

interface RewardRecord {
  id: string;
  user_id: string;
  username: string;
  jd_submission_id: string;
  reward_type: string;
  reward_value: string;
  status: string;
  fail_reason: string;
  created_at: string;
  processed_at: string;
  processed_by: string;
}

const rewardTypeLabels: Record<string, string> = {
  lifetime: '终身会员',
  monthly: '月度会员',
  bonus_months: '额外月数',
  jd_submit: 'JD提交奖励'
};

const rewardTypeColors: Record<string, string> = {
  lifetime: 'bg-purple-100 text-purple-700',
  monthly: 'bg-orange-100 text-orange-700',
  bonus_months: 'bg-blue-100 text-blue-700',
  jd_submit: 'bg-green-100 text-green-700'
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  success: { label: '成功', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  failed: { label: '失败', color: 'bg-red-100 text-red-700', icon: XCircle },
  pending: { label: '待处理', color: 'bg-yellow-100 text-yellow-700', icon: Clock }
};

export default function RewardsPage() {
  const { admin } = useAdminAuth();
  
  const [records, setRecords] = useState<RewardRecord[]>([]);
  const [stats, setStats] = useState({ total: 0, success: 0, failed: 0, pending: 0, todayFailed: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [modal, setModal] = useState<{ show: boolean; userId: string; username: string } | null>(null);
  const [grantForm, setGrantForm] = useState({ rewardType: 'lifetime', rewardValue: '1', reason: '' });
  const [grantLoading, setGrantLoading] = useState(false);

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/admin/api/rewards?page=${page}&pageSize=20&status=${statusFilter}`);
      const data = await response.json();
      
      if (data.code === 200) {
        setRecords(data.data.list);
        setStats(data.data.stats);
        setTotal(data.data.pagination.total);
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGrant = async () => {
    if (!modal) return;
    
    setGrantLoading(true);
    try {
      const response = await fetch('/admin/api/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: modal.userId,
          rewardType: grantForm.rewardType,
          rewardValue: grantForm.rewardValue,
          reason: grantForm.reason,
          adminId: admin?.id,
          adminUsername: admin?.username
        })
      });
      
      if (response.ok) {
        setModal(null);
        setGrantForm({ rewardType: 'lifetime', rewardValue: '1', reason: '' });
        fetchData();
      }
    } finally {
      setGrantLoading(false);
    }
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('zh-CN');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">奖励发放管理</h1>
      </div>

      {/* 告警提示 */}
      {stats.todayFailed > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <span className="text-red-700">
            今日有 <strong>{stats.todayFailed}</strong> 条奖励发放失败，请及时处理
          </span>
          <Button size="sm" variant="outline" className="ml-auto" onClick={() => { setStatusFilter('failed'); setPage(1); }}>
            查看失败记录
          </Button>
        </div>
      )}

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Gift className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">总发放记录</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">成功</p>
                <p className="text-2xl font-bold text-green-600">{stats.success}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">失败</p>
                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">待处理</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 筛选 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            {['all', 'success', 'failed', 'pending'].map(status => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setStatusFilter(status); setPage(1); }}
              >
                {status === 'all' ? '全部' : statusConfig[status]?.label}
                {status !== 'all' && (
                  <span className="ml-1 opacity-70">
                    ({status === 'success' ? stats.success : status === 'failed' ? stats.failed : stats.pending})
                  </span>
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 记录列表 */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">用户</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">奖励类型</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">奖励值</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">状态</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">失败原因</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">申请时间</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">处理信息</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-600" />
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                      暂无记录
                    </td>
                  </tr>
                ) : (
                  records.map(record => {
                    const StatusIcon = statusConfig[record.status]?.icon || Clock;
                    return (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span>{record.username || record.user_id}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={rewardTypeColors[record.reward_type] || 'bg-gray-100'}>
                            {rewardTypeLabels[record.reward_type] || record.reward_type}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {record.reward_value || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={statusConfig[record.status]?.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig[record.status]?.label || record.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-red-600 max-w-[200px] truncate">
                          {record.fail_reason || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {formatDate(record.created_at)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {record.processed_by ? `${record.processed_by} @ ${formatDate(record.processed_at)}` : '-'}
                        </td>
                        <td className="px-4 py-3">
                          {record.status !== 'success' && (
                            <Button
                              size="sm"
                              onClick={() => setModal({ show: true, userId: record.user_id, username: record.username || '' })}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              补发
                            </Button>
                          )}
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
                <span className="px-3 py-1 text-sm">第 {page} 页，共 {Math.ceil(total / 20)} 页</span>
                <Button size="sm" variant="outline" onClick={() => setPage(p => p + 1)} disabled={page * 20 >= total}>
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 手动补发弹窗 */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">手动补发奖励</h2>
                <button onClick={() => setModal(null)}><X className="w-5 h-5" /></button>
              </div>
              
              <p className="text-gray-600 mb-4">
                为用户 <strong>{modal.username || modal.userId}</strong> 补发奖励
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">奖励类型</label>
                  <select
                    value={grantForm.rewardType}
                    onChange={(e) => setGrantForm(prev => ({ ...prev, rewardType: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="lifetime">终身会员</option>
                    <option value="monthly">月度会员</option>
                    <option value="bonus_months">额外月数</option>
                  </select>
                </div>
                
                {grantForm.rewardType === 'bonus_months' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">月数</label>
                    <Input
                      type="number"
                      value={grantForm.rewardValue}
                      onChange={(e) => setGrantForm(prev => ({ ...prev, rewardValue: e.target.value }))}
                      min="1"
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium mb-1">备注原因</label>
                  <Input
                    value={grantForm.reason}
                    onChange={(e) => setGrantForm(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="可选，填写补发原因"
                  />
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setModal(null)}>取消</Button>
                  <Button onClick={handleGrant} disabled={grantLoading}>
                    {grantLoading ? '发放中...' : '确认发放'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
