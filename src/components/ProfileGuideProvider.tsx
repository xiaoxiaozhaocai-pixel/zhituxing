'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import ProfileGuideBar from './ProfileGuideBar';
import FirstVisitModal from './FirstVisitModal';

interface ProfileGuideProviderProps {
  children: React.ReactNode;
}

export default function ProfileGuideProvider({ children }: ProfileGuideProviderProps) {
  const pathname = usePathname();
  const [hasProfile, setHasProfile] = useState(false);
  const [checkDone, setCheckDone] = useState(false);

  // 如果是后台管理页面，不显示引导组件
  if (pathname?.startsWith('/admin')) {
    return <>{children}</>;
  }

  useEffect(() => {
    // 检查用户是否已完善个人信息
    checkUserProfile();
  }, []);

  const checkUserProfile = async () => {
    try {
      // 获取当前登录用户
      const userResponse = await fetch('/api/auth/me');
      const userData = await userResponse.json();
      
      if (userData.code === 200 && userData.data?.id) {
        // 获取用户个人信息
        const profileResponse = await fetch('/api/user/profile', {
          headers: { 'x-user-id': userData.data.id.toString() }
        });
        const profileData = await profileResponse.json();
        
        const has = profileData.code === 200 && (profileData.data?.major || profileData.data?.grade);
        setHasProfile(has);
      } else {
        // 未登录，不显示引导
        setHasProfile(true);
      }
    } catch (error) {
      console.error('检查用户信息失败:', error);
      setHasProfile(true); // 出错时默认不显示引导
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
      <FirstVisitModal hasProfile={hasProfile} />
    </>
  );
}
