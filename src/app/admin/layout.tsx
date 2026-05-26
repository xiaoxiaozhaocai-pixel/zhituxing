'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/admin/jd', label: 'JD管理', icon: '📋' },
  { href: '/admin/users', label: '用户看板', icon: '👥' },
  { href: '/admin/skills', label: '技能管理', icon: '🔗' },
  { href: '/admin/analytics', label: '行为看板', icon: '📊' },
  { href: '/admin/diagnostics', label: '网站诊断', icon: '🔍' },
];

const PAGE_TITLES: Record<string, string> = {
  '/admin/jd': 'JD数据管理',
  '/admin/users': '用户数据看板',
  '/admin/skills': '技能关系图管理',
  '/admin/analytics': '行为数据看板',
  '/admin/diagnostics': '网站诊断',
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAdmin() {
      try {
        let userId = '';
        try {
          const userData = localStorage.getItem('user');
          if (userData) {
            const parsed = JSON.parse(userData);
            userId = parsed.id || '';
          }
        } catch { userId = ''; }
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
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-[#64748B] text-lg">权限校验中...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="p-10 text-center max-w-md bg-white border border-[#E2E8F0] rounded-2xl shadow-sm">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-[#1E293B] mb-2">无权访问</h2>
          <p className="text-[#64748B] mb-6">管理后台仅限管理员访问</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* 左侧边栏 — 深蓝 */}
      <aside className="w-60 bg-gradient-to-b from-[#1E40AF] to-[#1E3A8A] flex flex-col fixed top-0 left-0 h-full z-40">
        {/* Logo */}
        <div className="p-5 border-b border-blue-700/50">
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-sm">职</span>
            职途星管理后台
          </h1>
          <p className="text-xs text-blue-200/60 mt-1">Administration Panel</p>
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
                    ? 'bg-white/20 text-white border border-white/10'
                    : 'text-blue-100/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* 底部 */}
        <div className="p-4 border-t border-blue-700/50">
          <button
            onClick={() => router.push('/')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-blue-200/60 hover:bg-white/10 hover:text-white transition"
          >
            ← 返回前台
          </button>
        </div>
      </aside>

      {/* 右侧内容区 — 白底 */}
      <main className="flex-1 ml-60">
        {/* 顶部标题栏 */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-[#E2E8F0] px-8 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#1E293B]">
            {PAGE_TITLES[pathname] || '管理后台'}
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-md font-medium border border-blue-100">Admin</span>
            <span className="text-sm text-[#64748B]">管理员</span>
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
