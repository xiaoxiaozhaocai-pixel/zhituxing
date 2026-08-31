import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * 认证路由保护（服务端）
 *
 * 背景：resume-optimize 等登录后功能页是纯客户端渲染，首屏 HTML 无正文，
 * 未登录用户访问时会先加载全部重型 JS（~480KB）再在客户端判定并跳转 /auth，
 * 造成未登录态 LCP 严重超标（5.0s 压 CI 5000ms 预算）。
 *
 * 修复：在服务端读取会话 cookie，未登录（无 sb-access-token 且无 sb-refresh-token）
 * 直接 307 重定向到 /auth。已登录用户放行，沿用 useAuth 客户端校验。
 *
 * 说明：仅保护登录后功能页路由，公开页（首页/insights 等）不受影响。
 */
export function middleware(request: NextRequest) {
  const accessToken = request.cookies.get('sb-access-token')?.value;
  const refreshToken = request.cookies.get('sb-refresh-token')?.value;

  // 无任何会话 token → 未登录 → 重定向到登录页
  if (!accessToken && !refreshToken) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // 仅匹配登录后功能页；如需扩展可在此追加路由
  matcher: ['/resume-optimize/:path*'],
};
