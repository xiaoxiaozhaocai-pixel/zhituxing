'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function FreeQuotaBadge() {
  const [freeQuota] = useState(5);
  const [isVisible, setIsVisible] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 只在AI助手页面显示
  if (!pathname.startsWith('/assistant')) {
    return null;
  }

  return (
    <Link
      href="/membership"
      className={`fixed top-24 right-4 z-40 flex items-center space-x-2 px-4 py-3 bg-white rounded-xl shadow-lg border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <div className="flex flex-col">
        <span className="text-xs text-gray-500">本月剩余免费次数</span>
        <span className="text-lg font-bold text-[#165DFF]">{freeQuota}/5</span>
      </div>
      <div className="w-8 h-8 bg-[#165DFF] rounded-full flex items-center justify-center">
        <span className="text-white text-xs font-bold">AI</span>
      </div>
    </Link>
  );
}
