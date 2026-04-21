'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, ArrowLeft, Search, Crown, User, Phone, Calendar } from 'lucide-react';

interface Member {
  id: string;
  phone: string;
  nickname: string | null;
  avatarUrl: string | null;
  memberType: string;
  quota: number;
  usedQuota: number;
  invites: number;
  createdAt: string;
}

export default function AdminUsersPage() {
  const { isAuthenticated } = useAuth();
  const [users, setUsers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [tab, setTab] = useState<'all' | 'members'>('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.data.users);
      }
    } catch (error) {
      console.error('获取用户失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.phone.includes(searchKeyword) ||
    (u.nickname && u.nickname.toLowerCase().includes(searchKeyword.toLowerCase()))
  ).filter(u => tab === 'all' || u.memberType !== 'free');

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p>请先登录</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <Button 
            variant={tab === 'all' ? 'default' : 'outline'}
            onClick={() => setTab('all')}
            className={tab === 'all' ? 'bg-[#165DFF]' : ''}
          >
            全部用户
          </Button>
          <Button 
            variant={tab === 'members' ? 'default' : 'outline'}
            onClick={() => setTab('members')}
            className={tab === 'members' ? 'bg-[#FF7D00]' : ''}
          >
            会员用户
          </Button>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="搜索手机号或昵称..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="text-center py-4">
              <p className="text-2xl font-bold text-blue-600">{users.length}</p>
              <p className="text-sm text-blue-600">总用户数</p>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="text-center py-4">
              <p className="text-2xl font-bold text-orange-600">
                {users.filter(u => u.memberType !== 'free').length}
              </p>
              <p className="text-sm text-orange-600">会员用户</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="text-center py-4">
              <p className="text-2xl font-bold text-green-600">
                {users.reduce((sum, u) => sum + u.invites, 0)}
              </p>
              <p className="text-sm text-green-600">总邀请数</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="text-center py-4">
              <p className="text-2xl font-bold text-purple-600">
                {users.reduce((sum, u) => sum + u.usedQuota, 0)}
              </p>
              <p className="text-sm text-purple-600">总使用次数</p>
            </CardContent>
          </Card>
        </div>

        {/* Users List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">用户</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">手机号</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">会员类型</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">配额</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">邀请</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">注册时间</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                              {user.avatarUrl ? (
                                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                            <span className="font-medium">{user.nickname || '未设置昵称'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{user.phone}</td>
                        <td className="px-4 py-3">
                          {user.memberType === 'free' ? (
                            <Badge variant="secondary">免费用户</Badge>
                          ) : (
                            <Badge className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
                              <Crown className="w-3 h-3 mr-1" />
                              {user.memberType === 'monthly' ? '月卡会员' : '年卡会员'}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={user.usedQuota >= user.quota ? 'text-red-600' : 'text-gray-600'}>
                            {user.quota - user.usedQuota} / {user.quota}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{user.invites}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {filteredUsers.length === 0 && !loading && (
          <div className="text-center py-16 text-gray-500">
            暂无用户数据
          </div>
        )}
      </div>
    </div>
  );
}
