'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * 注册页面 - 重定向到统一认证页面
 */
export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/auth');
  }, [router]);

  return null;
}
