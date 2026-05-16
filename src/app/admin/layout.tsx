'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Card } from '@/components/ui/card';

const NAV_ITEMS = [
  { href: '/admin/jd', label: 'JD管理', icon: '📋' },
  { href: '/admin/users', label: '用户看板', icon: '👥' },
  { href: '/admin/skills', label: '技能管理', icon: '🔗' },
  { href: '/admin/analytics', label: '行为看板', icon: '📊' },
];

const PAGE_TITLES: Record<string, string> = {
  '/admin/jd': 'JD数据管理',
  '/admin/users': '用户数据看板',
  '/admin/skills': '技能关系图管理',
  '/admin/analytics': '行为数据看板',
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAdmin() {
      try {
        const userId = localStorage.getItem('userId') || '999';
        const res = await fetch('/api/admin/auth', {
          headers: { 'x-user-id': userId },
        });
        const data = await res.json();
        if (data.isAdmin) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } catch {
        setIsAdmin(false);
      } finally {
        setChecking(false);
      }
    }
    checkAdmin();
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-slate-400 text-lg">权限校验中...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Card className="p-10 text-center max-w-md bg-slate-900 border-slate-700">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-white mb-2">无权访问</h2>
          <p className="text-slate-400 mb-6">管理后台仅限管理员访问</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            返回首页
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* 左侧边栏 */}
      <aside className="w-60 bg-slate-900 border-r border-slate-800 flex flex-col fixed top-0 left-0 h-full z-40">
        {/* Logo */}
        <div className="p-5 border-b border-slate-800">
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-sm">职</span>
            职途星管理后台
          </h1>
          <p className="text-xs text-slate-500 mt-1">Administration Panel</p>
        </div>

        {/* 导航项 */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* 底部 */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={() => router.push('/')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition"
          >
            ← 返回前台
          </button>
        </div>
      </aside>

      {/* 右侧内容区 */}
      <main className="flex-1 ml-60">
        {/* 顶部标题栏 */}
        <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur border-b border-slate-800 px-8 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            {PAGE_TITLES[pathname] || '管理后台'}
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded">Admin</span>
            <span className="text-sm text-slate-400">管理员</span>
          </div>
        </header>

        {/* 内容 */}
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
