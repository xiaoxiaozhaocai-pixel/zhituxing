export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getUserQuota } from '@/lib/quota';

/**
 * 注册接口 - 使用 Supabase Auth
 * 
 * 1. 验证验证码
 * 2. 使用 supabase.auth.signUp 创建用户
 * 3. 创建 user_profiles 记录
 * 4. 设置认证 cookie
 */

// 设置认证 Cookie
function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string,
  expiresAt: number
): void {
  const expiresIn = expiresAt - Math.floor(Date.now() / 1000);
  const maxAge = 30 * 24 * 60 * 60; // 30天
  
  response.cookies.set('sb-access-token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: expiresIn,
  });
  
  response.cookies.set('sb-refresh-token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAge,
  });
}

export async function POST(request: NextRequest) {
  try {
    const { phone, password, code, nickname, invite_code } = await request.json();

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

    // 检查用户是否已存在（user_profiles）
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('phone', phone)
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json(
        { error: '该手机号已注册，请直接登录' },
        { status: 400 }
      );
    }

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

    // 创建 user_profiles 记录
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: authData.user.id,
        phone: phone,
        email: null,
        nickname: userNickname,
        user_type: 'free',
        invite_code: `U${phone.slice(-6)}`,
      });

    if (profileError) {
      console.error('创建用户档案失败:', profileError);
      // 不回滚 auth 用户，让用户可以登录后重试
    }

    // 处理邀请码（如果有）
    if (invite_code) {
      const { data: inviter } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('invite_code', invite_code)
        .maybeSingle();
      
      if (inviter) {
        // 创建邀请记录
        await supabase
          .from('invites')
          .insert({
            inviter_id: inviter.user_id,
            invitee_id: authData.user.id,
            invite_code: invite_code,
            reward_quota: 3,
            reward_days: 7,
            reward_status: 'claimed',
            claimed_at: new Date().toISOString()
          });
      }
    }

    const quota = await getUserQuota(authData.user.id);

    // 创建响应并设置 cookie
    const response = NextResponse.json({
      success: true,
      message: '注册成功',
      user: {
        id: authData.user.id,
        phone: phone,
        nickname: userNickname,
        is_member: false,
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
  } catch (error) {
    console.error('注册失败:', error);
    return NextResponse.json({ error: '注册失败，请稍后重试' }, { status: 500 });
  }
}
