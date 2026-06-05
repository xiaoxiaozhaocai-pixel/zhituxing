import type { User } from '@supabase/supabase-js';
/**
 * Auth Refresh - 用 refresh_token 续期 Supabase 会话
 *
 * 设计目标：
 * - access_token 过期后自动用 refresh_token 续期，前端无感
 * - 服务端调用方负责把新 session 写回 cookie（setAuthCookies）
 * - refresh 也失败 → 返回 null，调用方应返回 401 让前端登出
 *
 * 安全要点：
 * - refresh_token 是用户级凭证，使用 anon key 调用 supabase.auth.refreshSession 即可
 * - 不持久化 session，每次单独 client，避免污染全局状态
 */

export type RefreshedSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: User;
};

export async function tryRefreshSession(
  refreshToken: string | null
): Promise<RefreshedSession | null> {
  if (!refreshToken) return null;

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session || !data.user) {
      console.log('[auth-refresh] refresh failed:', error?.message || 'no session');
      return null;
    }

    console.log('[auth-refresh] session refreshed for user:', data.user.id);

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at ?? 0,
      user: data.user,
    };
  } catch (err) {
    console.error('[auth-refresh] exception:', err);
    return null;
  }
}
