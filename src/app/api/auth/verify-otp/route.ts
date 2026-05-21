export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// 设置认证 Cookie
function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string,
  expiresAt: number
): void {
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = Math.max(expiresAt - now, 3600);
  const maxAge = 30 * 24 * 60 * 60;
  const isProd = process.env.NODE_ENV === 'production';
  
  const accessCookie = `sb-access-token=${accessToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${expiresIn}${isProd ? '; Secure' : ''}`;
  const refreshCookie = `sb-refresh-token=${refreshToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${isProd ? '; Secure' : ''}`;
  
  const existingCookies = response.headers.get('Set-Cookie') || '';
  const newCookies = existingCookies 
    ? `${existingCookies}, ${accessCookie}, ${refreshCookie}`
    : `${accessCookie}, ${refreshCookie}`;
  
  response.headers.set('Set-Cookie', newCookies);
}

export async function POST(request: NextRequest) {
  try {
    const { email, token, type = 'signup' } = await request.json();

    if (!email || !token) {
      return NextResponse.json({ error: '请提供邮箱和验证码' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: authData, error: authError } = await supabase.auth.verifyOtp({
      email,
      token,
      type,
    });

    if (authError) {
      console.error('OTP验证失败:', authError.message);
      if (authError.message.includes('expired')) {
        return NextResponse.json({ error: '验证码已过期，请重新获取' }, { status: 400 });
      }
      return NextResponse.json({ error: '验证码错误，请重新输入' }, { status: 400 });
    }

    if (!authData.user || !authData.session) {
      return NextResponse.json({ error: '验证失败，请重试' }, { status: 500 });
    }

    const response = NextResponse.json({
      success: true,
      message: '验证成功',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        nickname: authData.user.user_metadata?.nickname || `用户${authData.user.email?.split('@')[0]?.slice(-4) || ''}`,
        is_member: false
      },
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_at: authData.session.expires_at,
      }
    });
    
    setAuthCookies(
      response,
      authData.session.access_token,
      authData.session.refresh_token,
      authData.session.expires_at ?? 0
    );
    
    return response;
  } catch (error) {
    console.error('OTP验证失败:', error);
    return NextResponse.json({ error: '验证失败，请稍后重试' }, { status: 500 });
  }
}
