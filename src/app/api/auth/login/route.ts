export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isMember, getUserQuota } from '@/lib/quota';

/**
 * 登录接口 - 使用 Supabase Auth
 * 
 * 支持两种登录方式：
 * 1. 密码登录：使用 supabase.auth.signInWithPassword
 * 2. 验证码登录：使用 supabase.auth.verifyOtp
 * 
 * 用户信息从 user_profiles 表获取
 * 登录成功后设置 httpOnly cookie
 * 
 * 注意：认证操作使用 ANON_KEY，管理操作使用 SERVICE_ROLE_KEY
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
    
    // 使用 SERVICE_ROLE_KEY 客户端进行所有操作（更可靠）
    // 注意：虽然 signInWithPassword 通常用 ANON_KEY，但服务端用 SERVICE_ROLE_KEY 更稳定
    const supabase = getSupabaseAdmin();

    // ==================== 密码登录 ====================
    if (password) {
      // 使用 Supabase Auth signInWithPassword
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password,
      });

      if (authError) {
        console.error('密码登录失败:', authError.message, authError.status);
        // 统一错误信息，不暴露用户是否存在
        return NextResponse.json({ 
          error: '手机号/邮箱或密码错误',
          details: authError.message 
        }, { status: 401 });
      }

      if (!authData.user || !authData.session) {
        return NextResponse.json({ error: '登录失败，请重试' }, { status: 500 });
      }

      // 查询 user_profiles 获取用户详细信息
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', authData.user.id)
        .maybeSingle();

      // 如果 user_profiles 不存在，创建一个
      let userProfile = profile;
      if (!profile) {
        const { data: newProfile, error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: authData.user.id,
            phone: isEmail ? null : loginIdentifier,
            email: isEmail ? loginIdentifier : null,
            nickname: `用户${loginIdentifier.slice(-4)}`,
            user_type: 'free',
          })
          .select()
          .single();
        
        if (insertError) {
          console.error('创建用户档案失败:', insertError);
        } else {
          userProfile = newProfile;
        }
      }

      const isVip = await isMember(authData.user.id);
      const quota = await getUserQuota(authData.user.id);

      // 创建响应并设置 cookie
      const response = NextResponse.json({
        success: true,
        message: '登录成功',
        user: {
          id: authData.user.id,
          phone: userProfile?.phone || (isEmail ? null : loginIdentifier),
          email: userProfile?.email || (isEmail ? loginIdentifier : null),
          nickname: userProfile?.nickname || `用户${loginIdentifier.slice(-4)}`,
          is_member: isVip,
          quota
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
      // 使用 Supabase Auth verifyOtp
      const { data: authData, error: authError } = await supabase.auth.verifyOtp({
        email: loginEmail,
        token: code,
        type: 'email',  // 或 'sms' 如果是手机验证码
      });

      if (authError) {
        console.error('验证码登录失败:', authError);
        return NextResponse.json({ 
          error: '验证码错误或已过期',
          details: authError.message 
        }, { status: 400 });
      }

      if (!authData.user || !authData.session) {
        return NextResponse.json({ error: '验证失败，请重试' }, { status: 500 });
      }

      // 查询 user_profiles 获取用户详细信息
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', authData.user.id)
        .maybeSingle();

      // 如果 user_profiles 不存在，创建一个
      let userProfile = profile;
      if (!profile) {
        const { data: newProfile, error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: authData.user.id,
            phone: isEmail ? null : loginIdentifier,
            email: isEmail ? loginIdentifier : null,
            nickname: `用户${loginIdentifier.slice(-4)}`,
            user_type: 'free',
          })
          .select()
          .single();
        
        if (insertError) {
          console.error('创建用户档案失败:', insertError);
        } else {
          userProfile = newProfile;
        }
      }

      const isVip = await isMember(authData.user.id);
      const quota = await getUserQuota(authData.user.id);

      // 创建响应并设置 cookie
      const response = NextResponse.json({
        success: true,
        message: '登录成功',
        user: {
          id: authData.user.id,
          phone: userProfile?.phone || (isEmail ? null : loginIdentifier),
          email: userProfile?.email || (isEmail ? loginIdentifier : null),
          nickname: userProfile?.nickname || `用户${loginIdentifier.slice(-4)}`,
          is_member: isVip,
          quota
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
