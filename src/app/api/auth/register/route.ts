export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * 注册接口 - 使用 Supabase Auth
 * 
 * 1. 验证验证码
 * 2. 使用 supabase.auth.signUp 创建用户
 * 3. 设置认证 cookie
 * 
 * 不查询/创建 user_profiles 表
 */

// 设置认证 Cookie（使用 Set-Cookie header 确保生效）
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
    const { phone, password, code, nickname } = await request.json();

    // 验证必填项
    if (!phone || !password || !code) {
      return NextResponse.json(
        { error: '请填写完整信息' },
        { status: 400 }
      );
    }

    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return NextResponse.json(
        { error: '请输入正确的手机号' },
        { status: 400 }
      );
    }

    // 验证密码长度
    if (password.length < 6) {
      return NextResponse.json(
        { error: '密码至少6位' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 查询验证码
    const { data: verifyResult, error: verifyError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('phone', phone)
      .eq('type', 'register')
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (verifyError || !verifyResult) {
      return NextResponse.json({ error: '请先获取验证码' }, { status: 400 });
    }

    const verification = verifyResult as { id: string; code: string; expires_at: string };

    if (new Date(verification.expires_at) < new Date()) {
      return NextResponse.json({ error: '验证码已过期，请重新获取' }, { status: 400 });
    }

    if (verification.code !== code) {
      return NextResponse.json({ error: '验证码错误' }, { status: 400 });
    }

    // 标记验证码已使用
    await supabase
      .from('verification_codes')
      .update({ used: true })
      .eq('id', verification.id);

    // 使用 Supabase Auth 注册
    const userEmail = `${phone}@phone.temp`; // 虚拟邮箱
    const userNickname = nickname || `用户${phone.slice(-4)}`;
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userEmail,
      password: password,
      options: {
        data: {
          phone: phone,
          nickname: userNickname,
        },
      },
    });

    if (authError) {
      console.error('Supabase 注册失败:', authError);
      return NextResponse.json(
        { error: authError.message || '注册失败' },
        { status: 500 }
      );
    }

    if (!authData.user || !authData.session) {
      return NextResponse.json({ error: '注册失败，请重试' }, { status: 500 });
    }

    // 创建响应并设置 cookie
    const response = NextResponse.json({
      success: true,
      message: '注册成功',
      user: {
        id: authData.user.id,
        phone: phone,
        nickname: userNickname,
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
  } catch (error) {
    console.error('注册失败:', error);
    return NextResponse.json({ error: '注册失败，请稍后重试' }, { status: 500 });
  }
}
