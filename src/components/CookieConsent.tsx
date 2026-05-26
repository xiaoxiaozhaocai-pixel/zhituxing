'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'cookie_consent_v1';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // 检查是否已经做出过选择
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // 延迟显示，给页面一些加载时间
      const timer = setTimeout(() => {
        setVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setVisible(false);
    setDismissed(true);
  };

  const rejectNonEssential = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'rejected');
    setVisible(false);
    setDismissed(true);
  };

  // 如果已经做出过选择或被关闭，不显示
  if (dismissed || !visible) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
      <div className="mx-auto max-w-4xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              🍪 Cookie 使用提示
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              我们使用 Cookie 来改善您的浏览体验，包括维持登录状态和分析网站使用情况。
              继续使用即表示您同意我们的{' '}
              <Link href="/privacy" className="text-blue-600 hover:underline" target="_blank">
                隐私政策
              </Link>
              {' '}和{' '}
              <Link href="/terms" className="text-blue-600 hover:underline" target="_blank">
                服务条款
              </Link>
              。
            </p>
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={acceptCookies}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                接受全部 Cookie
              </Button>
              <Button 
                onClick={rejectNonEssential}
                variant="outline"
                size="sm"
              >
                仅必要的 Cookie
              </Button>
            </div>
          </div>
          <button
            onClick={rejectNonEssential}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="关闭"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
