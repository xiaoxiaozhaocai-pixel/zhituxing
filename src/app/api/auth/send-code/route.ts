export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email, type = 'signup' } = await request.json();

    if (!email) {
      return NextResponse.json({ error: '请输入邮箱' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: '请输入正确的邮箱地址' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 重发邮箱OTP验证码
    // 对于注册验证（signup类型），使用 resend 方法
    // 对于其他类型，使用 signInWithOtp
    let error;
    if (type === 'signup') {
      const result = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      error = result.error;
    } else {
      const result = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
        }
      });
      error = result.error;
    }

    if (error) {
      console.error('重发验证码失败:', error.message);
      return NextResponse.json({ error: '发送失败，请稍后重试' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '验证码已发送到您的邮箱'
    });
  } catch (error) {
    console.error('发送验证码失败:', error);
    return NextResponse.json({ error: '发送失败，请稍后重试' }, { status: 500 });
  }
}
