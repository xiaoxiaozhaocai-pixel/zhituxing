'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Flame, ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function TopPromoBar() {
  const { quota } = useAuth();
  const [isVisible, setIsVisible] = useState(true);
  const [remainingSpots] = useState(() => Math.floor(Math.random() * 201) + 800);
  
  // 已开通会员则隐藏
  useEffect(() => {
    if (quota?.is_member) {
      setIsVisible(false);
    }
  }, [quota?.is_member]);
  
  if (!isVisible || quota?.is_member) {
    return null;
  }
  
  return (
    <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white py-2 px-4 sticky top-0 z-[60] shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm md:text-base">
          <Flame className="w-4 h-4 md:w-5 md:h-5 animate-pulse" />
          <span className="font-medium">
            <span className="hidden sm:inline">首1000名用户专享：</span>
            <span className="font-bold">9.9元抢终身会员</span>
            <span className="hidden sm:inline">，永久解锁全部功能</span>
          </span>
          <span className="hidden md:inline text-orange-100 ml-2">
            🔥 剩余名额：{remainingSpots}/1000
          </span>
        </div>
        <Link href="/membership">
          <button className="bg-white text-orange-600 hover:bg-orange-50 px-4 py-1.5 rounded-full text-sm font-bold transition-all hover:scale-105 flex items-center gap-1">
            立即抢购
            <ArrowRight className="w-4 h-4" />
          </button>
        </Link>
      </div>
    </div>
  );
}
