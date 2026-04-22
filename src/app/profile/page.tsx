'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Crown,
  FileText,
  Heart,
  Users,
  Settings,
  LogOut,
  ChevronRight,
  MessageSquare,
  Loader2,
  UserCircle,
  Sparkles,
  Upload,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const menuItems = [
  {
    id: 'career-planning',
    title: '我的职业规划',
    description: '生成和管理职业规划报告',
    icon: <GraduationCap className="w-6 h-6 text-[#722ED1]" />,
    href: '/career-planning/my-reports',
    highlight: true,
    color: '#722ED1'
  },
  {
    id: 'info',
    title: '我的信息',
    description: '完善个人信息，获得精准AI建议',
    icon: <Sparkles className="w-6 h-6 text-[#165DFF]" />,
    href: '/profile/info',
    highlight: true,
    badge: '完善得精准规划'
  },
  {
    id: 'jd-submissions',
    title: '我的JD提交',
    description: '查看JD提交记录和审核状态',
    icon: <Upload className="w-6 h-6 text-[#FF7D00]" />,
    href: '/profile/jd-submissions',
    highlight: true
  },
  {
    id: 'history',
    title: '我的对话',
    description: '查看AI对话历史记录',
    icon: <MessageSquare className="w-6 h-6 text-[#165DFF]" />,
    href: '/profile/history'
  },
  {
    id: 'reports',
    title: '我的报告',
    description: '查看和下载职业规划报告',
    icon: <FileText className="w-6 h-6 text-purple-500" />,
    href: '/profile/reports'
  },
  {
    id: 'favorites',
    title: '我的收藏',
    description: '查看收藏的岗位和干货',
    icon: <Heart className="w-6 h-6 text-red-500" />,
    href: '/profile/favorites'
  },
  {
    id: 'invite',
    title: '我的邀请',
    description: '邀请好友得免费会员',
    icon: <Users className="w-6 h-6 text-green-500" />,
    href: '/profile/invite'
  },
  {
    id: 'settings',
    title: '账号设置',
    description: '修改个人信息和密码',
    icon: <Settings className="w-6 h-6 text-gray-500" />,
    href: '/profile/settings'
  }
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, logout, quota } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [profileCheckDone, setProfileCheckDone] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  // 检查用户是否已完善个人信息
  useEffect(() => {
    if (user) {
      checkProfile();
    }
  }, [user]);

  const checkProfile = async () => {
    if (!user) return;
    try {
      const response = await fetch('/api/user/profile', {
        headers: { 'x-user-id': user.id.toString() }
      });
      const data = await response.json();
      setHasProfile(data.code === 200 && (data.data?.major || data.data?.grade));
    } catch (error) {
      setHasProfile(false);
    } finally {
      setProfileCheckDone(true);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#165DFF]" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const getMemberBadge = () => {
    if (quota?.is_member) {
      return (
        <span className="bg-gradient-to-r from-[#FF7D00] to-[#FF9A00] text-white text-sm font-medium px-3 py-1 rounded-full">
          {quota.member_type === 'yearly' ? '年费会员' : '月费会员'}
        </span>
      );
    }
    return (
      <span className="bg-gray-100 text-gray-600 text-sm font-medium px-3 py-1 rounded-full">
        普通用户
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            我的个人中心
          </h1>
          <p className="text-gray-600">
            管理你的账号和使用记录
          </p>
        </div>

        {/* User Info Card */}
        <Card className="mb-8 border-2 border-gray-100">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-[#165DFF] rounded-full flex items-center justify-center">
                <span className="text-white text-2xl font-bold">
                  {user.nickname?.charAt(0) || user.phone.slice(-4)}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {user.nickname || `用户${user.phone.slice(-4)}`}
                </h2>
                <p className="text-gray-600">
                  {user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
                </p>
                <div className="flex items-center mt-2 space-x-2 flex-wrap gap-2">
                  {getMemberBadge()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 完善信息引导卡片 - 未完善时显示 */}
        {!hasProfile && profileCheckDone && (
          <Card className="mb-8 bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">完善你的个人信息</h3>
                    <p className="text-gray-600 text-sm">完善专业、年级等信息，获得更精准的AI服务和职业规划</p>
                  </div>
                </div>
                <Link href="/profile/info">
                  <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg">
                    立即完善
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Menu Grid */}
        <div className="space-y-4">
          {menuItems.map((item) => (
            <Link key={item.id} href={item.href}>
              <Card className={`border-2 border-gray-100 hover:shadow-md cursor-pointer transition-all duration-300 ${
                item.highlight && item.color === '#722ED1' 
                  ? 'bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200 hover:border-purple-300'
                  : item.highlight
                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-[#165DFF]/30 hover:border-[#165DFF]/50'
                    : 'hover:border-[#165DFF]/20'
              }`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center ${item.highlight ? 'bg-white' : ''}`}>
                        {item.icon}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          {item.title}
                          {/* 未完善信息时显示红点提示 */}
                          {!hasProfile && profileCheckDone && item.id === 'info' && (
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                          )}
                          {item.highlight && !(!hasProfile && profileCheckDone && item.id === 'info') && (
                            <span 
                              className="text-white text-xs px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: item.color || '#FF7D00' }}
                            >
                              {item.id === 'info' ? '完善得精准规划' : 'NEW'}
                            </span>
                          )}
                        </h3>
                        <p className="text-gray-600 text-sm">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* 会员入口 - 仅非会员用户可见 */}
        {!quota?.is_member && (
          <Card className="mt-8 bg-gradient-to-r from-[#FF7D00] to-[#FF9A00] border-0 shadow-xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                    <Crown className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">9.9元抢终身会员</h3>
                    <p className="text-white/90 text-sm">解锁全部求职工具，永久有效</p>
                  </div>
                </div>
                <Link href="/membership">
                  <Button className="bg-white text-[#FF7D00] hover:bg-gray-100 font-bold shadow-lg whitespace-nowrap">
                    立即抢购
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Logout Button */}
        <div className="mt-8">
          <Button
            variant="ghost"
            className="w-full border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <LogOut className="w-5 h-5 mr-2" />
            )}
            退出登录
          </Button>
        </div>
      </div>
    </div>
  );
}
