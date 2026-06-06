'use client';

import { useState } from 'react';

export default function SentryExamplePage() {
  const [result, setResult] = useState<string | null>(null);

  const triggerFrontendError = () => {
    // @ts-expect-error - 故意调用不存在函数触发 Sentry
    myUndefinedFunction();
  };

  const triggerApiError = async () => {
    const res = await fetch('/api/sentry-example-api');
    const data = await res.json();
    setResult(data.message || 'API 错误已触发');
  };

  return (
    <div className="min-h-screen bg-[#f8fafd] flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <h1 className="text-xl font-bold text-gray-800 mb-2">Sentry 测试页</h1>
        <p className="text-gray-500 mb-6 text-sm">点击按钮触发测试错误，验证 Sentry 是否正常上报</p>
        <div className="space-y-3">
          <button
            onClick={triggerFrontendError}
            className="w-full py-3 bg-[#165DFF] text-white rounded-xl hover:bg-[#165DFF]/90 font-medium"
          >
            触发前端错误
          </button>
          <button
            onClick={triggerApiError}
            className="w-full py-3 border border-[#165DFF] text-[#165DFF] rounded-xl hover:bg-[#165DFF]/5 font-medium"
          >
            触发 API 错误
          </button>
        </div>
        {result && (
          <p className="mt-4 text-sm text-green-600">{result}</p>
        )}
      </div>
    </div>
  );
}
