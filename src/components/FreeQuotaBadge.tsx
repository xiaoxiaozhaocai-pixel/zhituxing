'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

// 免费次数提示组件已禁用 - 按用户要求删除所有免费次数UI
export default function FreeQuotaBadge() {
  return null;
}
