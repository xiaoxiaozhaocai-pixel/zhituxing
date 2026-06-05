'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, Cookie, Settings } from 'lucide-react';

interface CookieCategories {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

interface CookieConsentData {
  accepted: boolean;
  categories: CookieCategories;
  timestamp: number;
}

const STORAGE_KEY = 'cookie_consent_v1';
const COOKIE_NAME = 'cookie_consent';
const COOKIE_MAX_AGE = 15552000; // 180 days in seconds

const defaultCategories: CookieCategories = {
  necessary: true,
  analytics: false,
  marketing: false,
};

const CookieConsent = () => {
  const [mounted, setMounted] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<CookieCategories>(defaultCategories);

  // Handle SSR hydration - only check storage after mount
  useEffect(() => {
    setMounted(true);
    const hasConsent = checkExistingConsent();
    if (!hasConsent) {
      setShowBanner(true);
    }
  }, []);

  // Listen for custom event to reopen preferences (triggered from footer link)
  useEffect(() => {
    const handleOpenPreferences = () => {
      setShowBanner(true);
      setShowDetails(true);
    };

    window.addEventListener('open-cookie-preferences', handleOpenPreferences);
    return () => window.removeEventListener('open-cookie-preferences', handleOpenPreferences);
  }, []);

  const checkExistingConsent = (): boolean => {
    try {
      // Check localStorage
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data: CookieConsentData = JSON.parse(stored);
        if (data && data.accepted && data.categories) {
          return true;
        }
      }

      // Check cookie (SSR-friendly fallback)
      if (typeof document !== 'undefined') {
        const cookies = document.cookie.split(';');
        const consentCookie = cookies.find(c => c.trim().startsWith(`${COOKIE_NAME}=`));
        if (consentCookie) {
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  };

  const saveConsent = useCallback((categories: CookieCategories) => {
    const consentData: CookieConsentData = {
      accepted: true,
      categories,
      timestamp: Date.now(),
    };

    try {
      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(consentData));

      // Save to cookie (so SSR can detect on next visit)
      document.cookie = `${COOKIE_NAME}=1; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;

      setShowBanner(false);
      setShowDetails(false);
    } catch (error) {
      console.error('Failed to save cookie consent:', error);
    }
  }, []);

  const handleAcceptAll = useCallback(() => {
    const allAccepted: CookieCategories = {
      necessary: true,
      analytics: true,
      marketing: true,
    };
    saveConsent(allAccepted);
  }, [saveConsent]);

  const handleAcceptNecessary = useCallback(() => {
    saveConsent(defaultCategories);
  }, [saveConsent]);

  const handleSavePreferences = useCallback(() => {
    saveConsent(selectedCategories);
  }, [saveConsent, selectedCategories]);

  const toggleCategory = useCallback((category: keyof CookieCategories) => {
    if (category === 'necessary') return; // Cannot disable necessary cookies
    setSelectedCategories(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  }, []);

  // Don't render anything until mounted (SSR hydration safety)
  if (!mounted) return null;
  if (!showBanner) return null;

  return (
    <>
      {/* Backdrop for details modal */}
      {showDetails && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setShowDetails(false)}
        />
      )}

      {/* Main Banner */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-blue-100 shadow-2xl transition-transform duration-300 ease-in-out ${
          showBanner ? 'translate-y-0' : 'translate-y-full'
        }`}
        role="region"
        aria-label="Cookie 同意横幅"
      >
        <div className="max-w-4xl mx-auto p-4 md:p-6">
          <div className="flex items-start gap-3 mb-3">
            <Cookie className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" aria-hidden="true" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                🍪 我们使用 Cookie 提升您的体验
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                职途星使用必要 Cookie 维持登录与安全，并希望使用分析 Cookie 帮助我们改进产品。
                您可以选择&ldquo;全部接受&rdquo;或仅保留必要功能。详情请查看
                <a href="/privacy" className="text-blue-600 hover:text-blue-700 underline mx-1">
                  《隐私政策》
                </a>
                。
              </p>
            </div>
            <button
              onClick={() => setShowBanner(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              aria-label="关闭 Cookie 横幅"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-4">
            <button
              onClick={handleAcceptNecessary}
              type="button"
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-white border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              仅必要
            </button>
            <button
              onClick={() => setShowDetails(true)}
              type="button"
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-white border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              查看详情
            </button>
            <button
              onClick={handleAcceptAll}
              type="button"
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm"
            >
              全部接受（推荐）
            </button>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {showDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Cookie 偏好设置">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-600" aria-hidden="true" />
                  <h3 className="text-lg font-semibold text-gray-900">Cookie 偏好设置</h3>
                </div>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="关闭偏好设置"
                  type="button"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Necessary Cookies */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">必要 Cookie</h4>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          始终启用
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        用于维持登录状态、会话安全、CSRF 防护。这是网站正常运行所必需的。
                      </p>
                    </div>
                    <div className="relative ml-3">
                      <input
                        type="checkbox"
                        checked={true}
                        disabled
                        readOnly
                        aria-label="必要 Cookie 始终启用"
                        className="w-5 h-5 rounded border-gray-300 bg-blue-100 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                {/* Analytics Cookies */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">分析 Cookie</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        帮助我们了解访客如何使用网站，用于改进产品体验。
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-3">
                      <input
                        type="checkbox"
                        checked={selectedCategories.analytics}
                        onChange={() => toggleCategory('analytics')}
                        aria-label="分析 Cookie 开关"
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                {/* Marketing Cookies */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">营销 Cookie</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        用于个性化推荐和广告投放，目前职途星暂未启用。
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-3">
                      <input
                        type="checkbox"
                        checked={selectedCategories.marketing}
                        onChange={() => toggleCategory('marketing')}
                        aria-label="营销 Cookie 开关"
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleSavePreferences}
                  type="button"
                  className="flex-1 px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  保存我的选择
                </button>
                <button
                  onClick={() => setShowDetails(false)}
                  type="button"
                  className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CookieConsent;
