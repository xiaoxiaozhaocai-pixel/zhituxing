export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// 简单内存限流器：60秒内最多3次
const sendCodeLimiter = new Map<string, { count: number; lastTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 60秒
const RATE_LIMIT_MAX = 3;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const record = sendCodeLimiter.get(key);
  
  if (!record) {
    sendCodeLimiter.set(key, { count: 1, lastTime: now });
    return true;
  }
  
  if (now - record.lastTime > RATE_LIMIT_WINDOW) {
    sendCodeLimiter.set(key, { count: 1, lastTime: now });
    return true;
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  sendCodeLimiter.set(key, { count: record.count + 1, lastTime: record.lastTime });
  return true;
}

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

    // 频率限制检查
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || request.headers.get('x-real-ip') 
      || 'unknown';
    const rateLimitKey = `${clientIp}:${email}`;
    
    if (!checkRateLimit(rateLimitKey)) {
      return NextResponse.json({ 
        error: '发送过于频繁，请60秒后再试' 
      }, { status: 429 });
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
