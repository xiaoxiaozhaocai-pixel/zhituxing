export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * 登录接口 - 使用 Supabase Auth
 * 
 * 支持两种登录方式：
 * 1. 密码登录：使用 supabase.auth.signInWithPassword
 * 2. 验证码登录：使用 supabase.auth.verifyOtp
 * 
 * 不查询 user_profiles 表，直接使用 auth.users 信息
 * 登录成功后设置 httpOnly cookie
 */

// ============================================================
// 设置认证 Cookie（使用 Set-Cookie header 确保生效）
// ============================================================
function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string,
  expiresAt: number
): void {
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = Math.max(expiresAt - now, 3600); // 至少1小时
  const maxAge = 30 * 24 * 60 * 60; // 30天
  
  const isProd = process.env.NODE_ENV === 'production';
  
  // 构建 Set-Cookie header
  const accessCookie = `sb-access-token=${accessToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${expiresIn}${isProd ? '; Secure' : ''}`;
  const refreshCookie = `sb-refresh-token=${refreshToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${isProd ? '; Secure' : ''}`;
  
  // 使用 headers.set 确保生效
  const existingCookies = response.headers.get('Set-Cookie') || '';
  const newCookies = existingCookies 
    ? `${existingCookies}, ${accessCookie}, ${refreshCookie}`
    : `${accessCookie}, ${refreshCookie}`;
  
  response.headers.set('Set-Cookie', newCookies);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, password, code, email } = body;
    
    // 确定登录标识（手机号或邮箱）
    const loginIdentifier = phone || email;
    
    if (!loginIdentifier) {
      return NextResponse.json({ error: '请输入手机号或邮箱' }, { status: 400 });
    }
    
    // 判断是手机号还是邮箱
    const isEmail = loginIdentifier.includes('@');
    const loginEmail = isEmail ? loginIdentifier : `${loginIdentifier}@phone.temp`;
    
    // 使用 SERVICE_ROLE_KEY 客户端
    const supabase = getSupabaseAdmin();

    // ==================== 密码登录 ====================
    if (password) {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password,
      });

      if (authError) {
        console.error('密码登录失败:', authError.message);
        return NextResponse.json({ 
          error: '手机号/邮箱或密码错误'
        }, { status: 401 });
      }

      if (!authData.user || !authData.session) {
        return NextResponse.json({ error: '登录失败，请重试' }, { status: 500 });
      }

      // 不查询 user_profiles，直接使用 auth.users 信息
      const response = NextResponse.json({
        success: true,
        message: '登录成功',
        user: {
          id: authData.user.id,
          phone: isEmail ? null : loginIdentifier,
          email: isEmail ? loginIdentifier : null,
          nickname: authData.user.user_metadata?.nickname || `用户${loginIdentifier.slice(-4)}`,
          is_member: false
        },
        session: {
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token,
          expires_at: authData.session.expires_at,
        }
      });
      
      // 设置认证 cookie
      setAuthCookies(
        response,
        authData.session.access_token,
        authData.session.refresh_token,
        authData.session.expires_at ?? 0
      );
      
      return response;
    }

    // ==================== 验证码登录 ====================
    if (code) {
      const { data: authData, error: authError } = await supabase.auth.verifyOtp({
        email: loginEmail,
        token: code,
        type: 'email',
      });

      if (authError) {
        console.error('验证码登录失败:', authError);
        return NextResponse.json({ 
          error: '验证码错误或已过期'
        }, { status: 400 });
      }

      if (!authData.user || !authData.session) {
        return NextResponse.json({ error: '验证失败，请重试' }, { status: 500 });
      }

      // 不查询 user_profiles，直接使用 auth.users 信息
      const response = NextResponse.json({
        success: true,
        message: '登录成功',
        user: {
          id: authData.user.id,
          phone: isEmail ? null : loginIdentifier,
          email: isEmail ? loginIdentifier : null,
          nickname: authData.user.user_metadata?.nickname || `用户${loginIdentifier.slice(-4)}`,
          is_member: false
        },
        session: {
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token,
          expires_at: authData.session.expires_at,
        }
      });
      
      // 设置认证 cookie
      setAuthCookies(
        response,
        authData.session.access_token,
        authData.session.refresh_token,
        authData.session.expires_at ?? 0
      );
      
      return response;
    }

    return NextResponse.json({ error: '请提供密码或验证码' }, { status: 400 });
  } catch (error) {
    console.error('登录失败:', error);
    return NextResponse.json({ error: '登录失败，请稍后重试' }, { status: 500 });
  }
}
