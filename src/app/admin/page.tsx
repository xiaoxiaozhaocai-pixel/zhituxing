'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, FileText, Users, Briefcase, Bell, Settings, Shield, CreditCard, MessageSquare } from 'lucide-react';

const adminMenu = [
  {
    title: '文章管理',
    description: '管理求职干货文章',
    icon: <FileText className="w-8 h-8" />,
    href: '/admin/articles',
    color: 'from-blue-500 to-blue-600'
  },
  {
    title: '内推管理',
    description: '管理内推岗位',
    icon: <Briefcase className="w-8 h-8" />,
    href: '/admin/referrals',
    color: 'from-orange-500 to-orange-600'
  },
  {
    title: '用户管理',
    description: '查看和管理用户',
    icon: <Users className="w-8 h-8" />,
    href: '/admin/users',
    color: 'from-green-500 to-green-600'
  },
  {
    title: '订单管理',
    description: '管理会员订单',
    icon: <CreditCard className="w-8 h-8" />,
    href: '/admin/orders',
    color: 'from-cyan-500 to-cyan-600'
  },
  {
    title: '工单管理',
    description: '处理用户反馈',
    icon: <MessageSquare className="w-8 h-8" />,
    href: '/admin/feedback',
    color: 'from-indigo-500 to-indigo-600'
  },
  {
    title: '消息通知',
    description: '发送系统通知',
    icon: <Bell className="w-8 h-8" />,
    href: '/admin/notifications',
    color: 'from-purple-500 to-purple-600'
  },
  {
    title: '系统设置',
    description: '网站基础配置',
    icon: <Shield className="w-8 h-8" />,
    href: '/admin/settings',
    color: 'from-red-500 to-red-600'
  }
];

export default function AdminPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [isAdmin] = useState(false); // 实际应从后端验证

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // 简单的管理员验证（实际应该从后端验证）
  const adminPhones = ['13800138000', '13900139000']; // 演示用，实际应从数据库读取
  const isRealAdmin = user && adminPhones.includes(user.phone);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle className="text-center">需要登录</CardTitle>
            <CardDescription className="text-center">
              请先登录管理员账号
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/auth">
              <Button className="w-full bg-[#165DFF]">去登录</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isRealAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <Shield className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <CardTitle>权限不足</CardTitle>
            <CardDescription>
              您没有管理员权限，无法访问后台管理系统
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button className="w-full">返回首页</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">管理中心</h1>
          <p className="text-gray-600">欢迎，{user.nickname || user.phone}</p>
        </div>

        {/* Admin Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminMenu.map((item, index) => (
            <Link key={index} href={item.href}>
              <Card className="border-2 border-gray-100 hover:border-blue-200 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer h-full">
                <CardHeader>
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white mb-4 shadow-lg`}>
                    {item.icon}
                  </div>
                  <CardTitle className="text-xl">{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="text-center py-6">
              <p className="text-3xl font-bold text-blue-600">1,234</p>
              <p className="text-sm text-blue-600">用户总数</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="text-center py-6">
              <p className="text-3xl font-bold text-green-600">56</p>
              <p className="text-sm text-green-600">文章总数</p>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="text-center py-6">
              <p className="text-3xl font-bold text-orange-600">128</p>
              <p className="text-sm text-orange-600">内推总数</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="text-center py-6">
              <p className="text-3xl font-bold text-purple-600">3,456</p>
              <p className="text-sm text-purple-600">AI对话次数</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
