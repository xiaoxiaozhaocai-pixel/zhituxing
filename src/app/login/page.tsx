'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * 登录页面 - 重定向到统一认证页面
 */
export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/auth');
  }, [router]);

  return null;
}
