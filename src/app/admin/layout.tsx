'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard, Briefcase, FileText, Users, TrendingUp,
  GitBranch, Activity, CreditCard, MessageSquare, Settings,
  ChevronDown, ChevronRight, Search, Shield, RefreshCw
} from 'lucide-react';

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  matchPattern?: string; // 用于匹配子路径，如 '/admin/jd' 匹配 '/admin/jd/xxx'
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: '概览',
    items: [
      { href: '/admin/dashboard', label: '数据看板', icon: <LayoutDashboard className="w-4 h-4" /> },
    ]
  },
  {
    label: '内容运营',
    items: [
      { href: '/admin/jd', label: 'JD管理', icon: <Briefcase className="w-4 h-4" />, matchPattern: '/admin/jd' },
      { href: '/admin/content', label: '内容管理', icon: <FileText className="w-4 h-4" /> },
      { href: '/admin/users', label: '用户管理', icon: <Users className="w-4 h-4" /> },
    ]
  },
  {
    label: '数据分析',
    items: [
      { href: '/admin/analytics', label: '行为看板', icon: <TrendingUp className="w-4 h-4" /> },
      { href: '/admin/skills', label: '技能图谱', icon: <GitBranch className="w-4 h-4" /> },
      { href: '/admin/diagnostics', label: '网站诊断', icon: <Activity className="w-4 h-4" /> },
    ]
  },
  {
    label: '系统管理',
    items: [
      { href: '/admin/orders', label: '订单管理', icon: <CreditCard className="w-4 h-4" /> },
      { href: '/admin/feedback', label: '反馈管理', icon: <MessageSquare className="w-4 h-4" /> },
      { href: '/admin/settings', label: '系统设置', icon: <Settings className="w-4 h-4" /> },
    ]
  },
];

const PAGE_TITLES: Record<string, string> = {
  '/admin/dashboard': '数据看板',
  '/admin/jd': 'JD数据管理',
  '/admin/jd-review': 'JD审核',
  '/admin/jd-sync': 'JD同步',
  '/admin/content': '内容管理',
  '/admin/users': '用户管理',
  '/admin/analytics': '行为数据看板',
  '/admin/skills': '技能关系图管理',
  '/admin/diagnostics': '网站诊断',
  '/admin/orders': '订单管理',
  '/admin/feedback': '反馈管理',
  '/admin/settings': '系统设置',
  '/admin/logs': '操作日志',
  '/admin/notifications': '通知管理',
  '/admin/recycle': '回收站',
  '/admin/export': '数据导出',
  '/admin/referrals': '内推管理',
  '/admin/rewards': '奖励管理',
  '/admin/sync': '数据同步',
  '/admin/career-planning': '职业规划',
  '/admin/jobs': '职位管理',
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (label: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const isItemActive = (item: NavItem) => {
    if (pathname === item.href) return true;
    if (item.matchPattern && pathname.startsWith(item.matchPattern)) return true;
    return false;
  };

  useEffect(() => {
    async function checkAdmin() {
      try {
        const res = await fetch('/api/admin/auth', {
          credentials: 'include',
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

        {/* 导航项 — 分组折叠 */}
        <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
          {NAV_GROUPS.map((group) => {
            const isCollapsed = collapsedGroups.has(group.label);
            const hasActiveChild = group.items.some(isItemActive);
            return (
              <div key={group.label} className="mb-1">
                {/* 分组标题 — 可点击折叠 */}
                <button
                  onClick={() => toggleGroup(group.label)}
                  className={`w-full flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition ${
                    hasActiveChild ? 'text-white/80' : 'text-blue-200/50 hover:text-blue-200/70'
                  }`}
                >
                  {isCollapsed
                    ? <ChevronRight className="w-3 h-3" />
                    : <ChevronDown className="w-3 h-3" />
                  }
                  {group.label}
                </button>
                {/* 分组子项 */}
                {!isCollapsed && (
                  <div className="space-y-0.5 mt-0.5">
                    {group.items.map((item) => {
                      const active = isItemActive(item);
                      return (
                        <button
                          key={item.href}
                          onClick={() => router.push(item.href)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                            active
                              ? 'bg-white/20 text-white border border-white/10 font-medium'
                              : 'text-blue-100/70 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {item.icon}
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
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
