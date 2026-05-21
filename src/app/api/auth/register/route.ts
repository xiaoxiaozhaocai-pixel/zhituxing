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
    const { email, password, nickname } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: '请填写邮箱和密码' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '请输入正确的邮箱地址' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: '密码至少6位' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const userNickname = nickname || `用户${email.split('@')[0].slice(-4)}`;
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nickname: userNickname,
        },
      },
    });

    if (authError) {
      console.error('Supabase 注册失败:', authError);
      
      if (authError.message.includes('already registered')) {
        return NextResponse.json(
          { error: '该邮箱已注册，请直接登录' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: authError.message || '注册失败' },
        { status: 500 }
      );
    }

    if (!authData.user) {
      return NextResponse.json({ error: '注册失败，请重试' }, { status: 500 });
    }

    if (authData.session) {
      const response = NextResponse.json({
        success: true,
        message: '注册成功',
        needsVerification: false,
        user: {
          id: authData.user.id,
          email: authData.user.email,
          nickname: userNickname,
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
    }

    return NextResponse.json({
      success: true,
      message: '注册成功，请查收邮箱验证码',
      needsVerification: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        nickname: userNickname,
      }
    });
  } catch (error) {
    console.error('注册失败:', error);
    return NextResponse.json({ error: '注册失败，请稍后重试' }, { status: 500 });
  }
}
