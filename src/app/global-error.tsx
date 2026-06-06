'use client';

import * as Sentry from '@sentry/nextjs';
import Link from 'next/link';
import { useEffect } from 'react';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body className="bg-[#f8fafd] flex items-center justify-center min-h-screen">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">页面出错了</h1>
          <p className="text-gray-500">我们已收到错误报告，请稍后重试。</p>
          <Link href="/" className="inline-block mt-4 text-[#165DFF] hover:underline">返回首页</Link>
        </div>
      </body>
    </html>
  );
}
