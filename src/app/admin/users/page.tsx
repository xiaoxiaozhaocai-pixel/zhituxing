'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { 
  Search, 
  Crown,
  Loader2,
  ChevronLeft,
  ChevronRight,
  User,
  Calendar,
  FileSearch
} from 'lucide-react';

interface User {
  id: string;
  username: string;
  email: string;
  created_at: string;
  last_login_time: string | null;
  member_type: string | null;
  member_expire_time: string | null;
  is_lifetime_member: boolean;
  interview_quota: number;
  assessment_quota: number;
  jd_count: number;
}

export default function UsersPage() {
  const { admin } = useAdminAuth();
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [memberType, setMemberType] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modal, setModal] = useState<{ show: boolean; userId: string | null; action: string; memberType: string }>({
    show: false,
    userId: null,
    action: '',
    memberType: 'monthly'
  });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [page, memberType]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '20',
        ...(keyword && { keyword }),
        ...(memberType !== 'all' && { memberType })
      });
      
      const response = await fetch(`/admin/api/users?${params}`);
      const data = await response.json();
      
      if (data.code === 200) {
        setUsers(data.data.list);
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

  const handleMemberAction = async () => {
    if (!modal.userId) return;
    
    setActionLoading(true);
    try {
      const response = await fetch('/admin/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: modal.userId,
          action: modal.action,
          memberType: modal.memberType,
          adminId: admin?.id,
          adminUsername: admin?.username
        })
      });
      
      if (response.ok) {
        setModal({ show: false, userId: null, action: '', memberType: 'monthly' });
        fetchData();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const getMemberStatus = (user: User) => {
    if (user.is_lifetime_member) {
      return <Badge className="bg-purple-100 text-purple-700">终身会员</Badge>;
    }
    if (user.member_type) {
      const expireDate = user.member_expire_time ? new Date(user.member_expire_time) : null;
      const isExpired = expireDate && expireDate < new Date();
      return (
        <Badge className={isExpired ? 'bg-gray-100 text-gray-500' : 'bg-orange-100 text-orange-700'}>
          {isExpired ? '已过期' : '月度会员'}
        </Badge>
      );
    }
    return <Badge variant="outline">普通用户</Badge>;
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('zh-CN');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>

      {/* 筛选 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="搜索用户名、邮箱..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <select
              value={memberType}
              onChange={(e) => { setMemberType(e.target.value); setPage(1); }}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
            >
              <option value="all">全部用户</option>
              <option value="member">仅会员</option>
              <option value="normal">仅普通用户</option>
            </select>
            <Button onClick={handleSearch}>搜索</Button>
          </div>
        </CardContent>
      </Card>

      {/* 用户列表 */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">用户</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">注册时间</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">最后登录</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">会员状态</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">到期时间</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">上传JD</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-600" />
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  users.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{user.username || '未设置'}</p>
                            <p className="text-sm text-gray-500">{user.email || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(user.last_login_time)}
                      </td>
                      <td className="px-4 py-3">
                        {getMemberStatus(user)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {user.is_lifetime_member ? '永久' : formatDate(user.member_expire_time)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="text-purple-600 font-medium">{user.jd_count}</span> 条
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {user.is_lifetime_member ? (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setModal({ show: true, userId: user.id, action: 'cancel', memberType: '' })}
                            >
                              取消会员
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setModal({ show: true, userId: user.id, action: 'open', memberType: 'monthly' })}
                            >
                              <Crown className="w-4 h-4 mr-1" />
                              开通会员
                            </Button>
                          )}
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
            <div className="px-4 py-3 border-t flex items-center justify-between">
              <span className="text-sm text-gray-500">共 {total} 条</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="px-3 py-1 text-sm">{page}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * 20 >= total}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 开通会员弹窗 */}
      {modal.show && modal.action === 'open' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">开通会员</h2>
              <p className="text-gray-600 mb-4">选择会员类型：</p>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="memberType"
                    value="monthly"
                    checked={modal.memberType === 'monthly'}
                    onChange={() => setModal(prev => ({ ...prev, memberType: 'monthly' }))}
                  />
                  <div>
                    <p className="font-medium">月度会员</p>
                    <p className="text-sm text-gray-500">9.9元/月</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="memberType"
                    value="lifetime"
                    checked={modal.memberType === 'lifetime'}
                    onChange={() => setModal(prev => ({ ...prev, memberType: 'lifetime' }))}
                  />
                  <div>
                    <p className="font-medium">终身会员</p>
                    <p className="text-sm text-gray-500">9.9元一次性</p>
                  </div>
                </label>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setModal({ show: false, userId: null, action: '', memberType: 'monthly' })}>
                  取消
                </Button>
                <Button onClick={handleMemberAction} disabled={actionLoading}>
                  确认开通
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 取消会员确认 */}
      {modal.show && modal.action === 'cancel' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">确认取消会员</h2>
              <p className="text-gray-600 mb-6">确定要取消该用户的会员资格吗？此操作不可撤销。</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setModal({ show: false, userId: null, action: '', memberType: 'monthly' })}>
                  取消
                </Button>
                <Button variant="destructive" onClick={handleMemberAction} disabled={actionLoading}>
                  确认取消
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
