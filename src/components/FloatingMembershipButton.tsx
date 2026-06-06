'use client';

import Link from 'next/link';
import { Crown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useMembership } from '@/contexts/MembershipContext';

export default function FloatingMembershipButton() {
  const pathname = usePathname();
  const { user, quota } = useAuth();
  const { isMember } = useMembership();
  const [visible, setVisible] = useState(false);
  const [quotaExhausted, setQuotaExhausted] = useState(false);

  useEffect(() => {
    const checkQuota = () => {
      if (!user) { setVisible(false); return; }
      const exhausted = !isMember && (quota?.remaining ?? 0) <= 0;
      setQuotaExhausted(exhausted);
      if (isMember) { setVisible(false); return; }
      if (typeof window !== 'undefined' && window.location.pathname === '/membership') {
        setVisible(false); return;
      }
      setVisible(true);
    };
    checkQuota();
    const interval = setInterval(checkQuota, 5000);
    return () => clearInterval(interval);
  }, [user, quota, isMember]);

  if (pathname?.startsWith('/admin') || pathname?.startsWith('/profile')) return null;
  if (!visible || !user) return null;

  return (
    <div className="fixed bottom-24 right-6 z-50">
      <Link href="/membership">
        <button className={`group relative flex items-center justify-center w-14 h-14 rounded-full shadow-lg btn-member transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-[#FF7D00]/40 ${quotaExhausted ? 'animate-pulse' : ''}`}>
          <Crown className="w-6 h-6 text-white" />
          {/* 悬停提示 */}
          <div className="absolute right-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
            <div className="bg-[#1E293B] text-white text-sm px-3.5 py-2.5 rounded-xl shadow-xl">
              <div className="font-semibold">开通会员</div>
              <div className="text-xs text-[#94A3B8] mt-0.5">无限次AI服务</div>
            </div>
          </div>
          {quotaExhausted && (
            <span className="absolute inset-0 rounded-full animate-ping bg-[#FF7D00] opacity-20" />
          )}
        </button>
      </Link>
    </div>
  );
}
