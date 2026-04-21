'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Menu, X, User, ChevronDown, Bell, Home, Briefcase, MessageSquare, Crown, BookOpen, Compass, HelpCircle, Phone, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { usePathname } from 'next/navigation';

const navItems = [
  { name: '首页', href: '/', icon: <Home className="w-5 h-5" /> },
  { name: 'AI职业规划', href: '/career-planning', icon: <Sparkles className="w-5 h-5" />, highlight: true, color: '#722ED1' },
  { name: '全行业岗位百科', href: '/jobs', icon: <Briefcase className="w-5 h-5" /> },
  { name: 'AI职业助手', href: '/assistant', icon: <MessageSquare className="w-5 h-5" /> },
  { name: '会员中心', href: '/membership', icon: <Crown className="w-5 h-5" />, highlight: true },
  { name: '求职干货', href: '/resources', icon: <BookOpen className="w-5 h-5" /> },
  { name: '使用流程', href: '/guide', icon: <Compass className="w-5 h-5" /> },
  { name: '常见问题', href: '/faq', icon: <HelpCircle className="w-5 h-5" /> },
  { name: '联系我们', href: '/contact', icon: <Phone className="w-5 h-5" /> },
];

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [freeQuota] = useState(5);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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
    // 每30秒刷新一次
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
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? 'bg-white shadow-md py-3' : 'bg-transparent py-4'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-[#165DFF] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">职</span>
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900">职途星</div>
                <div className="text-xs text-gray-500">你的AI职业规划助手</div>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                const itemColor = item.color || (item.highlight ? '#FF7D00' : '#165DFF');
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                      item.highlight
                        ? 'bg-[#FF7D00] text-white hover:bg-[#e67000]'
                        : isActive
                          ? `bg-[${itemColor}] text-white`
                          : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    style={isActive && item.color ? { backgroundColor: item.color } : undefined}
                  >
                    {item.icon}
                    {item.name}
                  </Link>
                );
              })}
            </div>

            {/* Right Section */}
            <div className="hidden lg:flex items-center space-x-4">
              {/* Free Quota Badge */}
              <Link
                href="/membership"
                className="flex items-center space-x-1 px-3 py-1.5 bg-gray-100 rounded-full text-sm hover:bg-gray-200 transition-colors"
              >
                <span className="text-gray-600">本月剩余免费次数：</span>
                <span className="font-bold text-[#165DFF]">{freeQuota}/5</span>
              </Link>

              {/* Notification Bell */}
              {user && (
                <Link
                  href="/notifications"
                  className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Bell className="w-5 h-5 text-gray-600" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs flex items-center justify-center rounded-full">
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </span>
                  )}
                </Link>
              )}

              {/* Auth Buttons */}
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-[#165DFF] rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium">{user.nickname}</span>
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link href="/notifications" className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Bell className="w-4 h-4" />
                          我的消息
                        </span>
                        {unreadNotifications > 0 && (
                          <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                            {unreadNotifications > 99 ? '99+' : unreadNotifications}
                          </span>
                        )}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profile/membership">我的会员</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profile/reports">我的报告</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profile/favorites">我的收藏</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profile/invite">我的邀请</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profile/settings">账号设置</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={handleLogout}
                    >
                      退出登录
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link href="/auth">
                    <Button
                      variant="ghost"
                      className="text-[#165DFF] hover:text-[#165DFF] hover:bg-[#165DFF]/10"
                    >
                      登录
                    </Button>
                  </Link>
                  <Link href="/auth">
                    <Button className="bg-[#165DFF] hover:bg-[#165DFF]/90 text-white">
                      注册
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white border-t">
            <div className="max-w-7xl mx-auto px-4 py-4 space-y-2">
              {/* Free Quota Badge */}
              <Link
                href="/membership"
                className="flex items-center justify-center space-x-1 px-4 py-2.5 bg-gradient-to-r from-[#165DFF] to-[#4080FF] rounded-lg text-sm text-white shadow-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Sparkles className="w-4 h-4" />
                <span>本月剩余免费次数：</span>
                <span className="font-bold text-lg">{freeQuota}/5</span>
              </Link>

              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium ${
                      item.highlight
                        ? 'bg-[#FF7D00] text-white text-center'
                        : isActive
                          ? 'bg-[#165DFF] text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.icon}
                    {item.name}
                  </Link>
                );
              })}

              {/* Auth Buttons */}
              <div className="pt-4 border-t space-y-2">
                {user ? (
                  <>
                    <div className="px-4 py-2 text-center">
                      <span className="font-medium">{user.nickname}</span>
                    </div>
                    <Button
                      variant="ghost"
                      className="w-full text-red-600"
                      onClick={() => {
                        handleLogout();
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      退出登录
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href="/auth" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full">
                        登录
                      </Button>
                    </Link>
                    <Link href="/auth" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button className="w-full bg-[#165DFF] hover:bg-[#165DFF]/90 text-white">
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
