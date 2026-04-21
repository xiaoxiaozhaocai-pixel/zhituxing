'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { GraduationCap, Check } from 'lucide-react';

interface FirstVisitModalProps {
  hasProfile: boolean;
  onComplete?: () => void;
}

export default function FirstVisitModal({ hasProfile, onComplete }: FirstVisitModalProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // 如果已完善个人信息，不显示弹窗
    if (hasProfile) {
      return;
    }

    // 检查是否已显示过首次访问弹窗
    const hasShown = localStorage.getItem('first_visit_modal_shown');
    if (hasShown) {
      return;
    }

    // 延迟显示，让页面先加载
    const timer = setTimeout(() => {
      setShow(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, [hasProfile]);

  const handleComplete = () => {
    localStorage.setItem('first_visit_modal_shown', 'true');
    setShow(false);
    onComplete?.();
  };

  const handleSkip = () => {
    localStorage.setItem('first_visit_modal_shown', 'true');
    setShow(false);
    onComplete?.();
  };

  if (!show) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* 顶部装饰 */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 h-24 flex items-center justify-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
        </div>

        {/* 内容 */}
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
            欢迎使用职途星！
          </h2>
          <p className="text-gray-500 text-center mb-6">
            30秒完善你的基本信息，获得100%精准的专属职业规划
          </p>

          {/* 优势列表 */}
          <div className="space-y-3 mb-6">
            {[
              '自动匹配你的专业和年级',
              '生成个性化的大学成长路径',
              '推荐最适合你的岗位和薪资',
              '无需重复输入，一次填写终身使用'
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-3 text-sm">
                <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-green-600" />
                </div>
                <span className="text-gray-700">{item}</span>
              </div>
            ))}
          </div>

          {/* 按钮 */}
          <div className="space-y-3">
            <Link href="/profile/info" onClick={handleComplete}>
              <button className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg shadow-purple-500/30">
                立即完善信息
              </button>
            </Link>
            <button
              onClick={handleSkip}
              className="w-full py-2 text-gray-500 text-sm hover:text-gray-700 transition-colors"
            >
              先随便看看
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
