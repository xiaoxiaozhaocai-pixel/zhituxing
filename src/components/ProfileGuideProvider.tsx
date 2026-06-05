'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import ProfileGuideBar from './ProfileGuideBar';
import FirstVisitModal from './FirstVisitModal';

interface ProfileGuideProviderProps {
  children: React.ReactNode;
}

export default function ProfileGuideProvider({ children }: ProfileGuideProviderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [hasProfile, setHasProfile] = useState(false);
  const [checkDone, setCheckDone] = useState(false);

  useEffect(() => {
    checkUserProfile();
  }, []);

  // 如果是后台/onboarding/auth页面，不拦截
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/onboarding') || pathname?.startsWith('/auth')) {
    return <>{children}</>;
  }

  const checkUserProfile = async () => {
    try {
      // 已通过引导的标志
      const onboardingDone = localStorage.getItem('onboarding_done');
      if (onboardingDone === 'true') {
        setHasProfile(true);
        setCheckDone(true);
        return;
      }

      // 获取当前登录用户
      const userResponse = await fetch('/api/auth/me');
      const userData = await userResponse.json();
      
      if (userData.ok && userData.data?.user?.id) {
        // 获取用户个人信息
        const profileResponse = await fetch('/api/user/profile', {
          credentials: 'include'
        });
        const profileData = await profileResponse.json();
        
        const has = profileData.success && (profileData.data?.major || profileData.data?.grade);
        setHasProfile(has);

        if (has) {
          // 已有基本信息，标记引导完成
          localStorage.setItem('onboarding_done', 'true');
        } else {
          // 无基本信息 → 跳转到引导页
          router.push('/onboarding');
        }
      } else {
        // 未登录
        setHasProfile(true);
      }
    } catch (error) {
      console.error('检查用户信息失败:', error);
      setHasProfile(true);
    } finally {
      setCheckDone(true);
    }
  };

  if (!checkDone) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      {/* 全局顶部常驻引导条 */}
      <ProfileGuideBar hasProfile={hasProfile} />
      {/* 首次访问弹窗 */}
      <FirstVisitModal />
    </>
  );
}
