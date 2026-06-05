'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { Menu, X, User, Bell, Home, Briefcase, MessageSquare, Crown, BookOpen, Compass, HelpCircle, Phone, Sparkles, LogOut, Target, BarChart3, Route, Network, FileText, ChevronDown, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useMembership } from '@/contexts/MembershipContext';
import { usePathname, useRouter } from 'next/navigation';

// 主导航项（精简为3项，高频使用功能）
const mainNavItems = [
  { name: '首页', href: '/', icon: <Home className="w-4 h-4" /> },
  { name: '岗位百科', href: '/jobs', icon: <Briefcase className="w-4 h-4" /> },
  { name: 'AI助手', href: '/assistant', icon: <MessageSquare className="w-4 h-4" /> },
  { name: '简历优化', href: '/resume-optimize', icon: <FileText className="w-4 h-4" /> },
];

// 更多导航项（低频使用功能，放入下拉菜单）
const moreNavItems = [
  { name: '岗位匹配', href: '/match', icon: <Target className="w-4 h-4" /> },
  { name: '能力测评', href: '/assessment', icon: <BarChart3 className="w-4 h-4" /> },
  { name: 'AI职业规划', href: '/career-planning', icon: <Sparkles className="w-4 h-4" /> },
  { name: '技能画像', href: '/skill-portrait', icon: <Target className="w-4 h-4" /> },
  { name: '学习路径', href: '/learning-path', icon: <Route className="w-4 h-4" /> },
  { name: '技能图谱', href: '/skills-graph', icon: <Network className="w-4 h-4" /> },
  { name: '会员中心', href: '/membership', icon: <Crown className="w-4 h-4" /> },
  { name: '求职干货', href: '/resources', icon: <BookOpen className="w-4 h-4" /> },
  { name: '使用流程', href: '/guide', icon: <Compass className="w-4 h-4" /> },
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
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 点击外部关闭"更多"下拉
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setIsMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 获取未读通知数
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!isAuthenticated) return;
      try {
        const res = await fetch('/api/notifications', {
          headers: { 'x-user-id': user!.id }
        });
        const data = await res.json();
        if (data.success) {
          setUnreadNotifications(data.data.unread);
        }
      } catch (error) {
        console.error('获取通知数失败:', error);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user]);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  const goToProfile = () => {
    router.push('/profile');
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-[#1E40AF]/95 backdrop-blur-xl shadow-lg shadow-blue-900/20 py-2'
            : 'bg-gradient-to-r from-[#1E40AF] to-[#1E3A8A] py-3'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2" aria-label="职途星 - 返回首页">
              <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center" aria-hidden="true">
                <span className="text-white font-bold text-lg">职</span>
              </div>
              <div>
                <div className="text-lg font-bold text-white">职途星</div>
                <div className="text-[10px] text-blue-200/70">AI职业规划助手</div>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-1">
              {mainNavItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'text-blue-100 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {item.icon}
                    {item.name}
                  </Link>
                );
              })}

              {/* "更多"下拉菜单 */}
              <div ref={moreRef} className="relative">
                <button
                  onClick={() => setIsMoreOpen(!isMoreOpen)}
                  aria-expanded={isMoreOpen}
                  aria-haspopup="menu"
                  aria-controls="more-menu"
                  aria-label="更多导航菜单"
                  className={`flex items-center gap-1 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isMoreOpen
                      ? 'bg-white/20 text-white'
                      : 'text-blue-100 hover:text-white hover:bg-white/10'
                  }`}
                >
                  更多
                  <ChevronDown aria-hidden="true" className={`w-3.5 h-3.5 transition-transform duration-200 ${isMoreOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* 下拉面板 */}
                <div
                  id="more-menu"
                  role="menu"
                  aria-label="更多功能"
                  className={`absolute top-full right-0 mt-2 w-52 rounded-xl border shadow-xl transition-all duration-200 origin-top-right ${
                    isMoreOpen
                      ? 'opacity-100 scale-100'
                      : 'opacity-0 scale-95 pointer-events-none'
                  } bg-white border-gray-200`}
                >
                  <div className="py-2">
                    {moreNavItems.map((item) => {
                      const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setIsMoreOpen(false)}
                          className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                            isActive
                              ? 'text-blue-600 bg-blue-50'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                          }`}
                        >
                          {item.icon}
                          {item.name}
                          {item.name === '会员中心' && (
                            <Crown className="w-3 h-3 text-amber-500 ml-auto" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Section */}
            <div className="hidden lg:flex items-center space-x-4">
              {/* Notification Bell */}
              {user && (
                <Link
                  href="/profile?tab=messages"
                  aria-label={unreadNotifications > 0 ? `通知中心，${unreadNotifications} 条未读` : '通知中心'}
                  className="relative p-2 rounded-lg transition-colors hover:bg-white/10"
                >
                  <Bell aria-hidden="true" className="w-5 h-5 text-blue-100" />
                  {unreadNotifications > 0 && (
                    <span aria-hidden="true" className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs flex items-center justify-center rounded-full">
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </span>
                  )}
                </Link>
              )}

              {/* Auth Buttons */}
              {authLoading ? (
                <div className="flex items-center space-x-2" aria-hidden="true">
                  <div className="w-20 h-9 bg-white/10 rounded-lg animate-pulse" />
                  <div className="w-8 h-8 bg-white/10 rounded-full animate-pulse" />
                </div>
              ) : user ? (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    className="flex items-center space-x-2 text-sm font-medium text-blue-100 hover:text-white hover:bg-white/10"
                    onClick={goToProfile}
                  >
                    <span>{user.nickname || '个人中心'}</span>
                  </Button>

                  <button onClick={goToProfile} aria-label={isMember ? '会员个人中心' : '个人中心'}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center transition-colors relative bg-white/20 hover:bg-white/30">
                      <User aria-hidden="true" className="w-4 h-4 text-white" />
                      {isMember && (
                        <Crown aria-hidden="true" className="w-3 h-3 text-amber-400 absolute -top-1 -right-1" />
                      )}
                    </div>
                  </button>

                  {isMember && (
                    <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      <Crown className="w-3 h-3" /> {membershipPlan || '会员'}
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link href="/auth">
                    <Button
                      variant="ghost"
                      className="text-blue-100 hover:text-white hover:bg-white/10"
                    >
                      登录
                    </Button>
                  </Link>
                  <Link href="/auth">
                    <Button className="bg-white text-blue-700 hover:bg-blue-50 font-semibold shadow-sm">
                      注册
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? '关闭主菜单' : '打开主菜单'}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {isMobileMenuOpen ? (
                <X aria-hidden="true" className="w-6 h-6 text-white" />
              ) : (
                <Menu aria-hidden="true" className="w-6 h-6 text-white" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div id="mobile-menu" className="lg:hidden border-t border-blue-700/50 bg-[#1E40AF]">
            <div className="max-w-7xl mx-auto px-4 py-4 space-y-2">
              {[...mainNavItems, ...moreNavItems].map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'text-blue-100 hover:text-white hover:bg-white/10'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.icon}
                    {item.name}
                  </Link>
                );
              })}

              {/* Auth Buttons */}
              <div className="pt-4 border-t border-blue-700/50 space-y-2">
                {authLoading ? (
                  <div className="w-full h-12 bg-white/10 rounded-lg animate-pulse" aria-hidden="true" />
                ) : user ? (
                  <>
                    <button
                      onClick={() => {
                        goToProfile();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-base font-medium bg-white/20 text-white"
                    >
                      <User className="w-5 h-5" />
                      {user.nickname || '个人中心'}
                    </button>
                    <Button
                      variant="ghost"
                      className="w-full text-red-300 hover:text-red-200"
                      onClick={() => {
                        handleLogout();
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <LogOut className="w-5 h-5 mr-2" />
                      退出登录
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href="/auth" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full text-blue-100 hover:text-white">
                        登录
                      </Button>
                    </Link>
                    <Link href="/auth" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button className="w-full bg-white text-blue-700 hover:bg-blue-50 font-semibold">
                        注册
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Spacer for fixed navbar */}
      <div className="h-20" />
    </>
  );
}
