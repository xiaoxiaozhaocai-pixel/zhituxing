import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookies, parseAccessTokenFromCookie } from '@/lib/auth-cookies';
import { getSupabaseAdmin } from '@/lib/supabase';
export const dynamic = 'force-dynamic';

/**
 * 注销路由 —— P0 安全修复
 * 原 bug：仅清除 cookie，未让 Supabase 服务端 session 失效。
 *        旧 access_token 仍能通过 supabase.auth.getUser() 校验，
 *        导致注销后访问 /api/auth/me 仍返回 200 + 用户信息。
 * 修复：
 *   ① 读取当前 access_token
 *   ② 调用 supabase.auth.admin.signOut(jwt, 'global') 撤销该用户全部 session
 *      （撤销后 Auth 服务器对该 token 的 /user 请求会返回 401）
 *   ③ 再清除浏览器端 access/refresh cookie
 */
export async function POST(request: NextRequest) {
  try {
    const accessToken = parseAccessTokenFromCookie(request.headers);

    if (accessToken) {
      try {
        const supabase = getSupabaseAdmin();
        // 使用 service-role admin API，scope='global' 撤销该 JWT 对应用户的全部 session
        const { error: signOutError } = await supabase.auth.admin.signOut(accessToken, 'global');
        if (signOutError) {
          // 即使 token 已过期或无效，也不阻塞登出流程，仅记录
          console.warn('[auth/logout] admin.signOut warning:', signOutError.message);
        }
      } catch (e) {
        console.warn('[auth/logout] admin.signOut threw (non-fatal):', e);
      }
    }

    const response = NextResponse.json({ success: true, message: '已退出登录' });
    clearAuthCookies(response);
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: '退出失败' }, { status: 500 });
  }
}
