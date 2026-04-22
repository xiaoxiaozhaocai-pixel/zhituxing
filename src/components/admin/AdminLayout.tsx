'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { 
  LayoutDashboard, 
  FileSearch, 
  Database, 
  RefreshCw,
  Users,
  FileText,
  Settings,
  ScrollText,
  ChevronRight,
  LogOut,
  Loader2,
  Briefcase,
  Bell,
  Plus,
  X
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { admin, loading, logout, isAuthenticated } = useAdminAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
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
    { path: '/admin/users', icon: Users, label: '用户管理' },
    { path: '/admin/content', icon: FileText, label: '内容管理' },
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
    <div className="min-h-screen bg-gray-100">
      {/* 顶部导航栏 */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50 flex items-center px-4">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg mr-2"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <LayoutDashboard className="w-6 h-6" />}
        </button>
        
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">职</span>
          </div>
          <span className="font-bold text-lg text-gray-900">职途星后台</span>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <span className="text-sm text-gray-500">
            欢迎，<span className="font-medium text-gray-900">{admin?.username}</span>
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            退出
          </button>
        </div>
      </header>

      {/* 侧边栏 */}
      <aside className={`
        fixed top-16 left-0 bottom-0 bg-white border-r border-gray-200 z-40
        transition-all duration-300 overflow-y-auto
        ${sidebarCollapsed ? 'w-16' : 'w-64'}
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const active = isActive(item.path, item.exact);
            const Icon = item.icon;
            
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                  ${active 
                    ? 'bg-purple-50 text-purple-700 border-l-4 border-purple-600' 
                    : 'text-gray-600 hover:bg-gray-50'
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-purple-600' : ''}`} />
                {!sidebarCollapsed && (
                  <span className="font-medium">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* 主内容区 */}
      <main className={`
        pt-16 min-h-screen transition-all duration-300
        ${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'}
      `}>
        <div className="p-6">
          {children}
        </div>
      </main>

      {/* 移动端遮罩 */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
