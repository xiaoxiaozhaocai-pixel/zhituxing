'use client';

import Link from 'next/link';
import { Crown, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function FloatingMembershipButton() {
  const { user, quota } = useAuth();
  const [visible, setVisible] = useState(false);
  const [quotaExhausted, setQuotaExhausted] = useState(false);

  useEffect(() => {
    // 检查配额是否用完
    const checkQuota = () => {
      if (!user) {
        setVisible(false);
        return;
      }

      const exhausted = !quota?.is_member && (quota?.remaining ?? 0) <= 0;
      setQuotaExhausted(exhausted);
      
      // 如果是会员，不显示悬浮按钮
      if (quota?.is_member) {
        setVisible(false);
        return;
      }

      // 如果在会员页面，不显示
      if (typeof window !== 'undefined' && window.location.pathname === '/membership') {
        setVisible(false);
        return;
      }

      setVisible(true);
    };

    checkQuota();

    // 每5秒检查一次
    const interval = setInterval(checkQuota, 5000);
    return () => clearInterval(interval);
  }, [user, quota]);

  if (!visible || !user) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Link href="/membership">
        <button
          className={`
            group relative flex items-center justify-center w-14 h-14 rounded-full shadow-lg
            transition-all duration-300 hover:scale-110 hover:shadow-xl
            ${quotaExhausted 
              ? 'bg-gradient-to-r from-[#FF7D00] to-[#FF9A2E] animate-pulse shadow-orange-500/40' 
              : 'bg-gradient-to-r from-[#FF7D00] to-[#FF9A2E] shadow-orange-500/30 hover:shadow-orange-500/50'
            }
          `}
        >
          <Crown className="w-6 h-6 text-white" />
          
          {/* 悬停提示 */}
          <div className="absolute right-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            <div className="bg-gray-900 text-white text-sm px-3 py-2 rounded-lg">
              <div className="font-medium">开通会员</div>
              <div className="text-xs text-gray-300">无限次AI服务</div>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 border-8 border-transparent border-l-gray-900" />
            </div>
          </div>

          {/* 闪烁效果 */}
          {quotaExhausted && (
            <span className="absolute inset-0 rounded-full animate-ping bg-[#FF7D00] opacity-30" />
          )}
        </button>
      </Link>
    </div>
  );
}
