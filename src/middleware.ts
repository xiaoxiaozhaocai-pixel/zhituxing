import { NextRequest, NextResponse } from 'next/server';
import {
  parseAccessTokenFromCookie,
  parseRefreshTokenFromCookie,
  setAuthCookies,
} from '@/lib/auth-cookies';

export const config = {
  // 只对 API 请求做透明续期，不干预页面 SSR
  matcher: '/api/:path*',
};

/** 轻量解析 JWT payload 的 exp（不验签，仅判断过期时间） */
function getTokenExp(jwt: string): number | null {
  try {
    const part = jwt.split('.')[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(json);
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

/**
 * 会话续期中间件：根治"导航显示已登录但页面间歇性踢回登录页"
 *
 * 根因：/api/auth/me 有 refresh 兜底，但 /api/user/*、/api/match 等数据 API
 * 只验证 access token——过期瞬间数据 API 全部 401 踢人，导航栏却续期成功。
 *
 * 策略：API 请求进入时若 access token 缺失/临期（<60s），用 refresh token 续期；
 * 新 access token 以 Bearer header 注入本次请求（getAuthenticatedUser 原生支持），
 * 新 cookie 写回响应。续期失败静默放行，401 判定仍由具体 API 决策，不改安全语义。
 */
export async function middleware(request: NextRequest) {
  const accessToken = parseAccessTokenFromCookie(request.headers);
  const refreshToken = parseRefreshTokenFromCookie(request.headers);

  // 未登录：直接放行
  if (!refreshToken) return NextResponse.next();

  // access token 仍有效（>60s 余量）：零开销放行
  if (accessToken) {
    const exp = getTokenExp(accessToken);
    if (exp !== null && exp > Date.now() / 1000 + 60) {
      return NextResponse.next();
    }
  }

  // access token 缺失或临期：续期
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
    );
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session) return NextResponse.next(); // 续期失败放行，由 API 返回 401

    const { access_token, refresh_token, expires_at } = data.session;
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('authorization', `Bearer ${access_token}`);
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    setAuthCookies(response, access_token, refresh_token, expires_at ?? Math.floor(Date.now() / 1000) + 3600);
    return response;
  } catch {
    return NextResponse.next();
  }
}
