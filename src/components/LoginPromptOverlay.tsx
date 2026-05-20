'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogIn, X, Lock } from 'lucide-react';

interface LoginPromptOverlayProps {
  /** 功能名称，用于显示提示文案 */
  featureName: string;
  /** 功能描述，可选 */
  description?: string;
  /** 子组件（被遮罩的内容） */
  children: React.ReactNode;
  /** 是否显示遮罩 */
  show: boolean;
  /** 是否模糊背景 */
  blur?: boolean;
}

/**
 * 未登录提示遮罩组件
 * 用于在未登录用户访问需要登录的功能时，显示半屏提示卡片
 * 而不是直接跳转到登录页
 */
export default function LoginPromptOverlay({
  featureName,
  description,
  children,
  show,
  blur = true,
}: LoginPromptOverlayProps) {
  const [dismissed, setDismissed] = useState(false);

  // 如果不显示遮罩或已关闭，直接渲染子组件
  if (!show || dismissed) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* 背景内容（带模糊效果） */}
      <div className={blur ? 'filter blur-sm pointer-events-none select-none' : ''}>
        {children}
      </div>

      {/* 遮罩层 */}
      <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-10 p-4">
        <Card className="w-full max-w-md shadow-2xl border-2 border-blue-100 animate-in fade-in zoom-in-95 duration-300">
          <CardContent className="p-8 text-center">
            {/* 图标 */}
            <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Lock className="w-8 h-8 text-white" />
            </div>

            {/* 标题 */}
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              登录解锁完整功能
            </h3>

            {/* 描述 */}
            <p className="text-gray-500 mb-2">
              登录后可保存你的{featureName}结果和职业画像
            </p>
            {description && (
              <p className="text-sm text-gray-400 mb-6">
                {description}
              </p>
            )}

            {/* 按钮 */}
            <div className="space-y-3 mt-6">
              <Link href="/auth">
                <Button className="w-full py-6 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg">
                  <LogIn className="w-5 h-5 mr-2" />
                  立即登录
                </Button>
              </Link>
              <Button
                variant="ghost"
                className="w-full text-gray-500 hover:text-gray-700"
                onClick={() => setDismissed(true)}
              >
                先看看再说
              </Button>
            </div>

            {/* 关闭按钮 */}
            <button
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 transition-colors"
              onClick={() => setDismissed(true)}
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
