'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

interface ProfileGuideBarProps {
  hasProfile: boolean;
}

export default function ProfileGuideBar({ hasProfile }: ProfileGuideBarProps) {
  const [visible, setVisible] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    // 如果已完善个人信息，不显示引导条
    if (hasProfile) {
      setHidden(true);
      return;
    }

    // 检查本地存储中的隐藏时间
    const hideTime = localStorage.getItem('profile_guide_hide_time');
    if (hideTime) {
      const elapsed = Date.now() - parseInt(hideTime);
      const twentyFourHours = 24 * 60 * 60 * 1000;
      if (elapsed < twentyFourHours) {
        setHidden(true);
        return;
      }
    }

    // 标记已访问过
    localStorage.setItem('has_visited', 'true');
    setVisible(true);
  }, [hasProfile]);

  const handleDismiss = () => {
    setVisible(false);
    setHidden(true);
    localStorage.setItem('profile_guide_hide_time', Date.now().toString());
  };

  // 已完善信息或已手动隐藏，不显示
  if (hidden || !visible) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100 fixed top-[64px] left-0 right-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-between">
        <div className="flex items-center gap-2 text-purple-800 text-sm">
          <span>💡</span>
          <span className="font-medium">完善你的个人信息，职业规划精准度提升100%</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/profile/info?from=/match"
            className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium rounded-full hover:from-purple-700 hover:to-indigo-700 transition-all shadow-sm"
          >
            立即完善
          </Link>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="稍后再说"
          >
            <span className="text-sm">稍后再说</span>
          </button>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors ml-1"
            title="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
