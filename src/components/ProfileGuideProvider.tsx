'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { X } from 'lucide-react';

interface ProfileGuideProviderProps {
  children: React.ReactNode;
}

export default function ProfileGuideProvider({ children }: ProfileGuideProviderProps) {
  const pathname = usePathname();
  const [hasProfile, setHasProfile] = useState(false);
  const [checkDone, setCheckDone] = useState(false);
  // Guide bar state (merged from ProfileGuideBar)
  const [showGuideBar, setShowGuideBar] = useState(false);

  useEffect(() => {
// eslint-disable-next-line
    checkUserProfile();
  }, []);

  const checkUserProfile = async () => {
    try {
      const onboardingDone = localStorage.getItem('onboarding_done');
      if (onboardingDone === 'true') {
        setHasProfile(true);
        setCheckDone(true);
        return;
      }

      const userResponse = await fetch('/api/auth/me');
      const userData = await userResponse.json();
      
      if (userData.ok && userData.data?.user?.id) {
        const profileResponse = await fetch('/api/user/profile', {
          credentials: 'include'
        });
        const profileData = await profileResponse.json();
        
        const has = profileData.success && (profileData.data?.major || profileData.data?.grade);
        setHasProfile(has);

        if (has) {
          localStorage.setItem('onboarding_done', 'true');
        }
        // 不再跳转到 /guide（已重定向），引导交给小职对话飞轮
      } else {
        setHasProfile(true);
      }
    } catch (error) {
      console.error('检查用户信息失败:', error);
      setHasProfile(true);
    } finally {
      setCheckDone(true);
    }
  };

  // Guide bar visibility logic (merged from ProfileGuideBar)
  useEffect(() => {
    if (pathname?.startsWith('/admin') || pathname?.startsWith('/guide') || pathname?.startsWith('/auth')) return;
    if (!checkDone) return;
    if (hasProfile) return;
    
    const hideTime = localStorage.getItem('profile_guide_hide_time');
    if (hideTime) {
      const elapsed = Date.now() - parseInt(hideTime);
      if (elapsed < 24 * 60 * 60 * 1000) return;
    }
    
    localStorage.setItem('has_visited', 'true');
    setShowGuideBar(true);
  }, [checkDone, hasProfile, pathname]);


  // Skip on admin/guide/auth pages
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/guide') || pathname?.startsWith('/auth')) {
    return <>{children}</>;
  }

  const handleDismissGuide = () => {
    setShowGuideBar(false);
    localStorage.setItem('profile_guide_hide_time', Date.now().toString());
  };

  if (!checkDone) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      {/* 个人信息完善引导条（合并自 ProfileGuideBar） */}
      {showGuideBar && (
        <div className="bg-gradient-to-r from-blue-50 to-blue-50 border-b border-blue-100 fixed top-[64px] left-0 right-0 z-40 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-800 text-sm">
              <span>💡</span>
              <span className="font-medium">跟小职聊聊你自己，我会记住你的专业和目标，让每次建议都更精准</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/assistant"
                className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-blue-600 text-white text-sm font-medium rounded-full hover:from-blue-700 hover:to-blue-700 transition-all shadow-sm"
              >
                去和小职聊聊
              </Link>
              <button onClick={handleDismissGuide} className="text-gray-400 hover:text-gray-600 transition-colors text-sm">
                稍后再说
              </button>
              <button onClick={handleDismissGuide} className="text-gray-400 hover:text-gray-600 transition-colors ml-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
