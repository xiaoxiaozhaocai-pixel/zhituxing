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
    highlight: true
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
    id: 'membership',
    title: '我的会员',
    description: '查看会员状态和到期时间',
    icon: <Crown className="w-6 h-6 text-[#FF7D00]" />,
    href: '/profile/membership'
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

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

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

  const getQuotaDisplay = () => {
    if (quota?.is_member) {
      return (
        <span className="text-sm text-[#FF7D00] font-medium">
          会员专享：无限次使用
        </span>
      );
    }
    return (
      <span className={`text-sm font-medium ${(quota?.remaining ?? 0) <= 0 ? 'text-red-500' : 'text-gray-500'}`}>
        本月剩余免费次数：{quota?.remaining ?? 0}/5
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
                  {getQuotaDisplay()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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
                          {item.highlight && (
                            <span 
                              className="text-white text-xs px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: item.color || '#FF7D00' }}
                            >
                              NEW
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
