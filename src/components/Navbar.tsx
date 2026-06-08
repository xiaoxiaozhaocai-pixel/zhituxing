'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { Menu, X, User, Bell, Home, Briefcase, MessageSquare, Crown, BookOpen, Compass, HelpCircle, Phone, Sparkles, LogOut, Target, Route, Network, FileText, ChevronDown, Building2, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useMembership } from '@/contexts/MembershipContext';
import { usePathname, useRouter } from 'next/navigation';

const mainNavItems = [
  { name: '首页', href: '/', icon: <Home className="w-4 h-4" /> },
  { name: '岗位百科', href: '/jobs', icon: <Briefcase className="w-4 h-4" /> },
  { name: 'AI助手', href: '/assistant', icon: <MessageSquare className="w-4 h-4" /> },
  { name: '我的成长', href: '/growth', icon: <TrendingUp className="w-4 h-4" /> },
  { name: '简历优化', href: '/resume-optimize', icon: <FileText className="w-4 h-4" /> },
];

const moreNavItems = [
  { name: '岗位匹配', href: '/match', icon: <Target className="w-4 h-4" /> },
  { name: '技能画像', href: '/skill-portrait', icon: <Target className="w-4 h-4" /> },
  { name: '学习路径', href: '/learning-path', icon: <Route className="w-4 h-4" /> },
  { name: '技能图谱', href: '/skills-graph', icon: <Network className="w-4 h-4" /> },
  { name: '互动课程', href: '/courses', icon: <BookOpen className="w-4 h-4" /> },
  { name: '考研就业决策', href: '/decision', icon: <Sparkles className="w-4 h-4" /> },
  { name: '会员中心', href: '/membership', icon: <Crown className="w-4 h-4" /> },
  { name: '求职干货', href: '/resources', icon: <BookOpen className="w-4 h-4" /> },
  { name: '快速开始', href: '/guide', icon: <Compass className="w-4 h-4" /> },
  { name: '常见问题', href: '/faq', icon: <HelpCircle className="w-4 h-4" /> },
  { name: '联系我们', href: '/contact', icon: <Phone className="w-4 h-4" /> },
  { name: '高校合作', href: '/university', icon: <Building2 className="w-4 h-4" /> },
];

export default function Navbar() {
  const { user, logout, isAuthenticated, loading: authLoading } = useAuth();
  const { isMember, membershipPlan } = useMembership();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const pathname = usePathname();
  const router = useRouter();
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setIsMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!isAuthenticated) return;
      try {
        const res = await fetch('/api/notifications', { headers: { 'x-user-id': user!.id } });
        const data = await res.json();
        if (data.success) setUnreadNotifications(data.data.unread);
      } catch {}
    };
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user]);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? 'glass-strong shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] py-2.5'
            : 'bg-white/80 backdrop-blur-lg py-3.5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group" aria-label="职途星 - 返回首页">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#165DFF] to-[#3D7FFF] flex items-center justify-center shadow-md shadow-[#165DFF]/20 group-hover:shadow-lg group-hover:shadow-[#165DFF]/30 group-hover:scale-105 transition-all duration-300">
                <span className="text-white font-bold text-base">职</span>
              </div>
              <div className="hidden sm:block">
                <div className="text-base font-bold text-[#1E293B] tracking-tight">职途星</div>
                <div className="text-[10px] text-[#94A3B8] -mt-0.5">AI职业规划助手</div>
              </div>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-0.5">
              {mainNavItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-[#165DFF]/8 text-[#165DFF]'
                        : 'text-[#475569] hover:text-[#1E293B] hover:bg-[#F1F5F9]'
                    }`}
                  >
                    {item.icon}
                    {item.name}
                  </Link>
                );
              })}

              {/* 更多下拉 */}
              <div ref={moreRef} className="relative">
                <button
                  onClick={() => setIsMoreOpen(!isMoreOpen)}
                  aria-expanded={isMoreOpen}
                  aria-haspopup="menu"
                  className={`flex items-center gap-1 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isMoreOpen
                      ? 'bg-[#165DFF]/8 text-[#165DFF]'
                      : 'text-[#475569] hover:text-[#1E293B] hover:bg-[#F1F5F9]'
                  }`}
                >
                  更多
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isMoreOpen ? 'rotate-180' : ''}`} />
                </button>
                <div
                  role="menu"
                  className={`absolute top-full right-0 mt-2 w-52 rounded-2xl glass-strong shadow-xl transition-all duration-200 origin-top-right ${
                    isMoreOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                  }`}
                >
                  <div className="py-1.5">
                    {moreNavItems.map((item) => {
                      const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setIsMoreOpen(false)}
                          className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                            isActive
                              ? 'text-[#165DFF] bg-[#165DFF]/6'
                              : 'text-[#475569] hover:text-[#1E293B] hover:bg-[#F8FAFC]'
                          }`}
                        >
                          {item.icon}
                          {item.name}
                          {item.name === '会员中心' && <Crown className="w-3 h-3 text-amber-500 ml-auto" />}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Right */}
            <div className="hidden lg:flex items-center gap-3">
              {user && (
                <Link
                  href="/profile?tab=messages"
                  aria-label={unreadNotifications > 0 ? `通知中心，${unreadNotifications} 条未读` : '通知中心'}
                  className="relative p-2 rounded-xl transition-colors hover:bg-[#F1F5F9]"
                >
                  <Bell className="w-5 h-5 text-[#64748B]" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center rounded-full shadow-sm">
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </span>
                  )}
                </Link>
              )}

              {authLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-20 h-9 bg-[#F1F5F9] rounded-xl animate-pulse" />
                  <div className="w-9 h-9 bg-[#F1F5F9] rounded-full animate-pulse" />
                </div>
              ) : user ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    className="text-sm font-medium text-[#475569] hover:text-[#1E293B] hover:bg-[#F1F5F9] rounded-xl"
                    onClick={() => router.push('/profile')}
                  >
                    {user.nickname || '个人中心'}
                  </Button>
                  <button onClick={() => router.push('/profile')} className="relative">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#F1F5F9] hover:bg-[#E2E8F0] transition-colors">
                      <User className="w-4 h-4 text-[#475569]" />
                      {isMember && <Crown className="w-3 h-3 text-amber-500 absolute -top-1 -right-1" />}
                    </div>
                  </button>
                  {isMember && (
                    <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      <Crown className="w-3 h-3" /> {membershipPlan || '会员'}
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <Link href="/auth">
                    <Button variant="ghost" className="text-[#475569] hover:text-[#1E293B] hover:bg-[#F1F5F9] rounded-xl">
                      登录
                    </Button>
                  </Link>
                  <Link href="/auth">
                    <Button className="btn-gradient rounded-xl font-semibold text-sm px-5 py-2">
                      免费注册
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile toggle */}
            <button
              className="lg:hidden p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-[#F1F5F9] transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? '关闭菜单' : '打开菜单'}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5 text-[#1E293B]" /> : <Menu className="w-5 h-5 text-[#1E293B]" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-[#E2E8F0] bg-white/95 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-5 py-4 space-y-1.5">
              {[...mainNavItems, ...moreNavItems].map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#165DFF]/8 text-[#165DFF]'
                        : 'text-[#475569] hover:bg-[#F8FAFC]'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.icon}
                    {item.name}
                  </Link>
                );
              })}
              <div className="pt-3 border-t border-[#E2E8F0] space-y-2">
                {authLoading ? (
                  <div className="w-full h-12 bg-[#F1F5F9] rounded-xl animate-pulse" />
                ) : user ? (
                  <>
                    <button
                      onClick={() => { router.push('/profile'); setIsMobileMenuOpen(false); }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-[#F1F5F9] text-[#1E293B] hover:bg-[#E2E8F0] transition-colors"
                    >
                      <User className="w-4 h-4" /> {user.nickname || '个人中心'}
                    </button>
                    <Button
                      variant="ghost"
                      className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
                      onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                    >
                      <LogOut className="w-4 h-4 mr-2" /> 退出登录
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href="/auth" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full rounded-xl text-[#475569]">登录</Button>
                    </Link>
                    <Link href="/auth" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button className="w-full btn-gradient rounded-xl font-semibold">免费注册</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
      <div className="h-16" />
    </>
  );
}
