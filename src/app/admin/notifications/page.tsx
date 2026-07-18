'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import {
  Mail,
  Loader2,
  Send,
  Trash2,
  Users,
  User,
  Crown,
  X,
  CheckCircle
} from 'lucide-react';

interface Notification {
  id: string;
  user_id: string;
  title: string;
  content: string;
  type: string;
  is_read: boolean;
  created_at: string;
  user_nickname: string;
}

const typeLabels: Record<string, string> = {
  system: '系统通知',
  activity: '活动通知',
  personal: '私信'
};

const typeColors: Record<string, string> = {
  system: 'bg-blue-100 text-blue-700',
  activity: 'bg-blue-100 text-blue-700',
  personal: 'bg-green-100 text-green-700'
};

export default function NotificationsPage() {
  const { admin } = useAdminAuth();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState({ totalSent: 0, todaySent: 0, activityCount: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState('all');
  
  const [modal, setModal] = useState(false);
  const [sendForm, setSendForm] = useState({
    title: '',
    content: '',
    type: 'system',
    targetType: 'all',
    targetUserId: ''
  });
  const [sendLoading, setSendLoading] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  useEffect(() => {
// eslint-disable-next-line react-hooks/immutability
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, typeFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/admin/api/notifications?page=${page}&pageSize=20&type=${typeFilter}`);
      const data = await response.json();
      
      if (data.code === 200) {
        setNotifications(data.data.list);
        setStats(data.data.stats);
        setTotal(data.data.pagination.total);
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!sendForm.title || !sendForm.content) return;
    
    setSendLoading(true);
    setSendResult(null);
    try {
      const response = await fetch('/admin/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...sendForm,
          adminId: admin?.id,
          adminUsername: admin?.username
        })
      });
      
      const result = await response.json();
      if (result.code === 200) {
        setSendResult(result.message);
        setSendForm({ title: '', content: '', type: 'system', targetType: 'all', targetUserId: '' });
        setTimeout(() => {
          setModal(false);
          setSendResult(null);
          fetchData();
        }, 1500);
      }
    } finally {
      setSendLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/admin/api/notifications?id=${id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('zh-CN');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">站内信管理</h1>
        <Button onClick={() => setModal(true)} className="bg-blue-600 hover:bg-blue-700">
          <Send className="w-4 h-4 mr-2" />
          发送站内信
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">总发送量</p>
                <p className="text-2xl font-bold">{stats.totalSent}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Send className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">今日发送</p>
                <p className="text-2xl font-bold">{stats.todaySent}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">活动通知</p>
                <p className="text-2xl font-bold">{stats.activityCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 筛选 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            {['all', 'system', 'activity', 'personal'].map(type => (
              <Button
                key={type}
                variant={typeFilter === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setTypeFilter(type); setPage(1); }}
              >
                {typeLabels[type] || '全部'}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 发送记录列表 */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">类型</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">标题</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">接收人</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">发送时间</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                    </td>
                  </tr>
                ) : notifications.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                      暂无发送记录
                    </td>
                  </tr>
                ) : (
                  notifications.map(notification => (
                    <tr key={notification.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Badge className={typeColors[notification.type]}>
                          {typeLabels[notification.type] || notification.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{notification.title}</p>
                        <p className="text-sm text-gray-500 truncate max-w-[300px]">{notification.content}</p>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {notification.user_id === 'all' ? (
                          <span className="flex items-center gap-1 text-blue-600">
                            <Users className="w-4 h-4" /> 全体用户
                          </span>
                        ) : notification.user_id === 'members' ? (
                          <span className="flex items-center gap-1 text-orange-600">
                            <Crown className="w-4 h-4" /> 会员用户
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" /> {notification.user_nickname || notification.user_id}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(notification.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600"
                          onClick={() => handleDelete(notification.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
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

      {/* 发送站内信弹窗 */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">发送站内信</h2>
                <button onClick={() => setModal(false)}><X className="w-5 h-5" /></button>
              </div>
              
              {sendResult ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <p className="text-lg font-medium text-green-600">{sendResult}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">通知类型</label>
                    <select
                      value={sendForm.type}
                      onChange={(e) => setSendForm(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="system">系统通知</option>
                      <option value="activity">活动通知</option>
                      <option value="personal">私信</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">发送对象</label>
                    <select
                      value={sendForm.targetType}
                      onChange={(e) => setSendForm(prev => ({ ...prev, targetType: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="all">全体用户</option>
                      <option value="members">仅会员用户</option>
                      <option value="single">指定用户</option>
                    </select>
                  </div>
                  
                  {sendForm.targetType === 'single' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">用户ID</label>
                      <Input
                        value={sendForm.targetUserId}
                        onChange={(e) => setSendForm(prev => ({ ...prev, targetUserId: e.target.value }))}
                        placeholder="输入用户ID"
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">标题</label>
                    <Input
                      value={sendForm.title}
                      onChange={(e) => setSendForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="输入通知标题"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">内容</label>
                    <textarea
                      value={sendForm.content}
                      onChange={(e) => setSendForm(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="输入通知内容"
                      rows={5}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />
                  </div>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
                    {sendForm.targetType === 'all' && '此通知将发送给所有用户'}
                    {sendForm.targetType === 'members' && '此通知将发送给所有会员用户'}
                    {sendForm.targetType === 'single' && '此通知将发送给指定用户'}
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setModal(false)}>取消</Button>
                    <Button onClick={handleSend} disabled={sendLoading || !sendForm.title || !sendForm.content}>
                      {sendLoading ? '发送中...' : '发送'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
