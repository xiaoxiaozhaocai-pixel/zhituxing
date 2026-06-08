'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbProps {
  theme?: 'light' | 'dark' | 'transparent';
  className?: string;
}

const routeLabels: Record<string, string> = {
  '/': '首页',
  '/jobs': '职位',
  '/career-planning': '职业规划（已迁移）',
  '/assessment': '能力评估（已迁移）',
  '/growth': '我的成长',
  '/profile': '个人中心',
  '/profile/info': '个人信息',
  '/profile/invite': '邀请好友',
  '/skill-portrait': '技能画像',
  '/learning-path': '学习路径',
  '/referrals': '内推机会',
  '/assistant': 'AI助手',
  '/membership': '会员中心',
  '/notifications': '消息通知',
  '/faq': '常见问题',
  '/guide': '使用指南',
};

const Breadcrumb: React.FC<BreadcrumbProps> = ({ theme = 'light', className = '' }) => {
  const pathname = usePathname();

  if (!pathname || pathname === '/') {
    return null;
  }

  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbItems = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const label = routeLabels[href] || segment;
    return { href, label };
  });

  const themeClasses: Record<string, string> = {
    light: 'text-gray-800',
    dark: 'text-gray-100',
    transparent: 'text-white/80',
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://zhituxing.tech'}${item.href}`,
    })),
  };

  return (
    <nav aria-label="面包屑导航" className={`flex items-center space-x-1 ${themeClasses[theme]} ${className}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Link href="/" className="hover:underline flex items-center">
        <Home className="w-4 h-4" />
      </Link>
      {breadcrumbItems.map((item, index) => (
        <React.Fragment key={item.href}>
          <ChevronRight className="w-4 h-4 mx-1" />
          {index === breadcrumbItems.length - 1 ? (
            <span aria-current="page" className="font-medium">
              {item.label}
            </span>
          ) : (
            <Link href={item.href} className="hover:underline">
              {item.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumb;
