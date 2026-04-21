'use client';

import Link from 'next/link';
import { AlertTriangle, Sparkles } from 'lucide-react';

interface GenerateGuideModalProps {
  show: boolean;
  onClose: () => void;
  onContinue: () => void;
}

export default function GenerateGuideModal({ show, onClose, onContinue }: GenerateGuideModalProps) {
  if (!show) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* 顶部装饰 */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 h-20 flex items-center justify-center border-b border-purple-100">
          <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        {/* 内容 */}
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-4">
            生成更精准的职业规划
          </h2>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="mb-2">检测到你还未完善个人信息，当前只能生成通用版报告，精准度降低50%</p>
                <p>完善信息后，将为你生成基于你的专业、年级和兴趣的专属规划</p>
              </div>
            </div>
          </div>

          {/* 按钮 */}
          <div className="space-y-3">
            <Link href="/profile/info" onClick={onClose}>
              <button className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg shadow-purple-500/30">
                完善信息后生成
              </button>
            </Link>
            <button
              onClick={onContinue}
              className="w-full py-2.5 text-gray-600 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              继续生成通用版
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
