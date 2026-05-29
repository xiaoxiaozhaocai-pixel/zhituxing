import { NextResponse } from 'next/server';
import {
  parseAccessTokenFromCookie,
  parseRefreshTokenFromCookie,
  setAuthCookies,
} from '@/lib/auth-cookies';
import { tryRefreshSession } from '@/lib/auth-refresh';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const accessToken = parseAccessTokenFromCookie(request.headers);
    const refreshToken = parseRefreshTokenFromCookie(request.headers);

    if (!accessToken && !refreshToken) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let user: any = null;
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
      return NextResponse.json({ error: '认证失败' }, { status: 401 });
    }

    // 返回用户信息
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        phone: user.user_metadata?.phone || user.phone || null,
        nickname:
          user.user_metadata?.nickname ||
          '用户' + (user.email?.split('@')[0]?.slice(-4) || ''),
      },
      ...(refreshed && { refreshed: true }),
    });

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
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
