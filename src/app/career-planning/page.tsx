'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CareerPlanningRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/assistant?bot=career');
  }, [router]);
  return null;
}
