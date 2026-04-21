'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function FreeQuotaBadge() {
  const [isVisible, setIsVisible] = useState(true);
  const pathname = usePathname();
  const { quota, user } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 只在AI助手页面显示，且用户已登录
  if (!pathname.startsWith('/assistant') || !user) {
    return null;
  }

  // 会员用户显示会员标识
  if (quota?.is_member) {
    return (
      <Link
        href="/membership"
        className={`fixed top-24 right-4 z-40 flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-[#FF7D00] to-[#FF9A00] text-white rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <div className="flex flex-col">
          <span className="text-xs opacity-90">会员专享</span>
          <span className="text-lg font-bold">无限次使用</span>
        </div>
        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
          <span className="text-xs font-bold">VIP</span>
        </div>
      </Link>
    );
  }

  // 非会员显示剩余次数
  const remaining = quota?.remaining ?? 0;

  return (
    <Link
      href="/membership"
      className={`fixed top-24 right-4 z-40 flex items-center space-x-2 px-4 py-3 bg-white rounded-xl shadow-lg border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <div className="flex flex-col">
        <span className="text-xs text-gray-500">本月剩余免费次数</span>
        <span className={`text-lg font-bold ${remaining <= 0 ? 'text-red-500' : 'text-[#165DFF]'}`}>
          {remaining}/5
        </span>
      </div>
      <div className="w-8 h-8 bg-[#165DFF] rounded-full flex items-center justify-center">
        <span className="text-white text-xs font-bold">AI</span>
      </div>
    </Link>
  );
}
