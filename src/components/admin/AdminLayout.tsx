'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAdminAuth, AdminAuthProvider } from '@/hooks/useAdminAuth';
import { 
  LayoutDashboard, 
  FileSearch, 
  Database, 
  RefreshCw,
  Users,
  FileText,
  Settings,
  ScrollText,
  LogOut,
  Loader2,
  Gift,
  Mail,
  Trash2,
  Download
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { admin, loading, logout, isAuthenticated } = useAdminAuth();

  // 如果不是登录页面且未登录，重定向到登录页
  useEffect(() => {
    if (!loading && !isAuthenticated && pathname !== '/admin/login') {
      router.push('/admin/login');
    }
  }, [loading, isAuthenticated, pathname, router]);

  // 登录页面不需要布局
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // 加载中
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F4F6]">
        <Loader2 className="w-8 h-8 animate-spin text-[#7C3AED]" />
      </div>
    );
  }

  // 未登录
  if (!isAuthenticated) {
    return null;
  }

  const menuItems = [
    { path: '/admin', icon: LayoutDashboard, label: '数据看板', exact: true },
    { path: '/admin/jd-review', icon: FileSearch, label: 'JD审核' },
    { path: '/admin/jobs', icon: Database, label: 'JD管理' },
    { path: '/admin/sync', icon: RefreshCw, label: '同步任务' },
    { path: '/admin/rewards', icon: Gift, label: '奖励发放' },
    { path: '/admin/notifications', icon: Mail, label: '站内信' },
    { path: '/admin/users', icon: Users, label: '用户管理' },
    { path: '/admin/recycle', icon: Trash2, label: '回收站' },
    { path: '/admin/content', icon: FileText, label: '内容管理' },
    { path: '/admin/export', icon: Download, label: '数据导出' },
    { path: '/admin/logs', icon: ScrollText, label: '操作日志' },
    { path: '/admin/settings', icon: Settings, label: '系统设置' },
  ];

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return pathname === path;
    return pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    router.push('/admin/login');
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      {/* 侧边栏 - 固定左侧，深灰色背景 */}
      <aside className="fixed top-0 left-0 bottom-0 w-[240px] bg-[#1F2937] z-50 overflow-y-auto">
        {/* Logo区域 */}
        <div className="h-16 flex items-center px-5 border-b border-gray-700">
          <div className="w-9 h-9 bg-gradient-to-br from-[#7C3AED] to-purple-400 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-base">职</span>
          </div>
          <span className="ml-3 text-white font-semibold text-lg">职途星管理后台</span>
        </div>

        {/* 菜单导航 */}
        <nav className="p-3">
          {menuItems.map((item) => {
            const active = isActive(item.path, item.exact);
            const Icon = item.icon;
            
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all duration-200
                  ${active 
                    ? 'bg-[#7C3AED] text-white' 
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }
                `}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* 顶部导航栏 - 白色背景，固定顶部 */}
      <header className="fixed top-0 left-[240px] right-0 h-16 bg-white shadow-sm z-40 flex items-center px-6">
        <div className="flex-1" />

        <div className="flex items-center gap-4">
          {/* 管理员信息 */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-[#7C3AED] to-purple-400 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {admin?.username?.charAt(0).toUpperCase() || 'A'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900">{admin?.username}</span>
              <span className="text-xs text-gray-500">管理员</span>
            </div>
          </div>

          <div className="w-px h-8 bg-gray-200 mx-2" />

          {/* 退出按钮 */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>退出登录</span>
          </button>
        </div>
      </header>

      {/* 主内容区 - 浅灰色背景 */}
      <main className="ml-[240px] pt-16 min-h-screen">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
