'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Menu, X, User, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const navItems = [
  { name: '首页', href: '/' },
  { name: '全行业岗位百科', href: '/jobs' },
  { name: 'AI职业助手', href: '/assistant' },
  { name: '会员中心', href: '/membership', highlight: true },
  { name: '求职干货', href: '/resources' },
  { name: '使用流程', href: '/guide' },
  { name: '常见问题', href: '/faq' },
  { name: '联系我们', href: '/contact' },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [freeQuota] = useState(5);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-gray-100 ${
                    item.highlight
                      ? 'bg-[#FF7D00] text-white hover:bg-[#e67000]'
                      : 'text-gray-700'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
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

              {/* Auth Buttons */}
              {isLoggedIn ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-[#165DFF] rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium">张三</span>
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
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
                      onClick={() => setIsLoggedIn(false)}
                    >
                      退出登录
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center space-x-3">
                  <Button
                    variant="ghost"
                    onClick={() => setIsLoggedIn(true)}
                    className="text-[#165DFF] hover:text-[#165DFF] hover:bg-[#165DFF]/10"
                  >
                    登录
                  </Button>
                  <Button
                    className="bg-[#165DFF] hover:bg-[#165DFF]/90 text-white"
                    onClick={() => setIsLoggedIn(true)}
                  >
                    注册
                  </Button>
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
                className="flex items-center justify-center space-x-1 px-4 py-2 bg-gray-100 rounded-lg text-sm"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="text-gray-600">本月剩余免费次数：</span>
                <span className="font-bold text-[#165DFF]">{freeQuota}/5</span>
              </Link>

              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`block px-4 py-3 rounded-lg text-base font-medium ${
                    item.highlight
                      ? 'bg-[#FF7D00] text-white text-center'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}

              {/* Auth Buttons */}
              <div className="pt-4 border-t space-y-2">
                {isLoggedIn ? (
                  <Button
                    variant="ghost"
                    className="w-full text-red-600"
                    onClick={() => {
                      setIsLoggedIn(false);
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    退出登录
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={() => {
                        setIsLoggedIn(true);
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      登录
                    </Button>
                    <Button
                      className="w-full bg-[#165DFF] hover:bg-[#165DFF]/90 text-white"
                      onClick={() => {
                        setIsLoggedIn(true);
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      注册
                    </Button>
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
