export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { setAuthCookies } from '@/lib/auth-cookies';

export async function POST(request: NextRequest) {
  console.warn("[register] 此路由已弃用，请使用 send-code + verify-otp 流程");
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

    // 密码强度校验
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json(
        { error: '密码至少8位，需包含大写字母、小写字母和数字' },
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
