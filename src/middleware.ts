/**
 * Next.js 全局中间件
 * 
 * 功能：
 *   1. CSRF 防护：对所有 POST/PUT/DELETE/PATCH 请求验证 Origin/Referer
 *   2. 安全响应头：X-Frame-Options、X-Content-Type-Options、Referrer-Policy
 * 
 * 依赖：src/lib/csrf.ts 中的 validateCSRF()
 */
import { NextRequest, NextResponse } from 'next/server';
import { validateCSRF } from '@/lib/csrf';

export function middleware(request: NextRequest) {
  // CSRF 检查：对状态变更请求验证 Origin/Referer
  const csrfResult = validateCSRF(request);
  if (csrfResult) {
    return csrfResult;
  }

  // 安全响应头
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export const config = {
  matcher: [
    // 匹配所有 API 路由
    '/api/:path*',
    // 匹配管理后台
    '/admin/:path*',
  ],
};
