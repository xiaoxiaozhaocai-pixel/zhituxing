import {
  parseAccessTokenFromCookie,
  parseRefreshTokenFromCookie,
  setAuthCookies,
} from '@/lib/auth-cookies';
import { getSupabaseAdmin } from '@/lib/supabase';
import { tryRefreshSession } from '@/lib/auth-refresh';
import type { User } from '@/lib/types';
import { jsonOk, jsonError } from '@/lib/api-contracts/_shared';
import { MeDataSchema, type MeData } from '@/lib/api-contracts/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const accessToken = parseAccessTokenFromCookie(request.headers);
    const refreshToken = parseRefreshTokenFromCookie(request.headers);

    if (!accessToken && !refreshToken) {
      return jsonError('UNAUTHORIZED', '请先登录');
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let user: User | null = null;
    let refreshed: {
      accessToken: string;
      refreshToken: string;
      expiresAt: number;
    } | null = null;

    // 1. 先尝试 access_token
    if (accessToken) {
      const { data, error } = await supabase.auth.getUser(accessToken);
      if (!error && data.user) {
        user = data.user;
      }
    }

    // 2. access_token 无效/过期 → 用 refresh_token 续期
    if (!user && refreshToken) {
      const refreshedSession = await tryRefreshSession(refreshToken);
      if (refreshedSession) {
        user = refreshedSession.user;
        refreshed = {
          accessToken: refreshedSession.accessToken,
          refreshToken: refreshedSession.refreshToken,
          expiresAt: refreshedSession.expiresAt,
        };
      }
    }

    // 3. 都失败 → 401
    if (!user) {
      return jsonError('UNAUTHORIZED', '认证失败');
    }

    // 查询 membership 信息
    const supabaseAdmin = getSupabaseAdmin();
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('user_type, membership_type, membership_expires_at')
      .eq('user_id', user.id)
      .maybeSingle();
    
    const isMember = profile?.user_type === 'member' || profile?.user_type === 'lifetime'
      || profile?.membership_type === 'member' || profile?.membership_type === 'lifetime';
    const isExpired = !isMember && profile?.membership_expires_at
      ? new Date(profile.membership_expires_at) < new Date()
      : false;

    // 构造契约 data（含 membership）
    const data: MeData = {
      user: {
        id: user.id,
        email: user.email ?? null,
        phone: user.user_metadata?.phone || user.phone || null,
        nickname:
          user.user_metadata?.nickname ||
          '用户' + (user.email?.split('@')[0]?.slice(-4) || ''),
        membership: {
          isMember: isMember && !isExpired,
          type: profile?.user_type || profile?.membership_type || 'free',
          expiresAt: profile?.membership_expires_at ?? null,
        },
      },
      ...(refreshed && { refreshed: true as const }),
    };

    const response = jsonOk(MeDataSchema, data);

    // 如果是续期来的，写回新 cookie
    if (refreshed) {
      setAuthCookies(
        response,
        refreshed.accessToken,
        refreshed.refreshToken,
        refreshed.expiresAt
      );
    }

    return response;
  } catch (err) {
    console.error('[auth/me] Error:', err);
    return jsonError('INTERNAL_ERROR', '服务器错误');
  }
}
