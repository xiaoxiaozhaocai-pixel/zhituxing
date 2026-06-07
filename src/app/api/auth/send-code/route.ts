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
        error: '发送过于频繁，请60秒后再试',
        hint: 'Supabase SMTP 有 60 秒最小发送间隔限制'
      }, { status: 429 });
    }

    // 🧪 测试模式：DEV_OTP_BYPASS 开启时跳过真实邮件发送
    if (process.env.DEV_OTP_BYPASS === 'true') {
      console.log('[send-code] 🧪 测试模式：跳过邮件发送', { email, type });
      return NextResponse.json({
        success: true,
        message: '验证码已发送（测试模式）',
        hint: '测试模式：请输入验证码 88888888',
        devBypassCode: '88888888'
      });
    }

    const supabase = getSupabaseAdmin();
    
    // 检查 Supabase 配置
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      console.error('[send-code] Supabase URL 未配置');
      return NextResponse.json({ 
        error: '服务配置错误',
        hint: '请联系管理员检查 Supabase 配置'
      }, { status: 500 });
    }

    console.log('[send-code] 准备发送验证码:', {
      email,
      type,
      supabaseUrl: supabaseUrl?.substring(0, 30) + '...',
      timestamp: new Date().toISOString()
    });

    // 重发邮箱OTP验证码
    // 统一使用 signInWithOtp 方法，更可靠
    // - 对于已注册用户：发送 Magic Link / OTP
    // - 对于新用户：如果 shouldCreateUser=false，会返回错误
    console.log('[send-code] 使用 signInWithOtp 方法，type:', type);
    const result = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: type === 'signup', // 注册时允许创建用户
        data: type === 'signup' ? { action: 'resend_signup' } : undefined,
      }
    });
    const error = result.error;
    console.log('[send-code] signInWithOtp 结果:', {
      hasError: !!error,
      errorMessage: error?.message,
      errorCode: error?.status,
      hasSession: !!result.data?.session
    });

    if (error) {
      console.error('[send-code] 发送验证码失败:', {
        message: error.message,
        status: error.status,
        name: error.name,
        email
      });
      
      // 提供更具体的错误提示
      let userMessage = '发送失败，请稍后重试';
      let hint = '';
      
      if (error.message?.includes('rate limit') || error.status === 429) {
        userMessage = '发送过于频繁，请60秒后再试';
        hint = 'Supabase SMTP 有发送频率限制';
      } else if (error.message?.includes('not found') || error.status === 404) {
        userMessage = '邮箱未注册';
        hint = '请先注册账号';
      } else if (error.message?.includes('invalid email')) {
        userMessage = '邮箱格式无效';
      } else if (error.message?.includes('SMTP') || error.message?.includes('mail')) {
        userMessage = '邮件服务暂时不可用';
        hint = '请联系管理员检查 SMTP 配置';
      }
      
      return NextResponse.json({ 
        error: userMessage,
        hint,
        debugId: Date.now().toString(36) // 用于问题排查
      }, { status: error.status || 500 });
    }

    console.log('[send-code] 验证码发送成功:', { email, type });
    
    return NextResponse.json({
      success: true,
      message: '验证码已发送到您的邮箱',
      hint: '如果未收到，请检查垃圾邮件文件夹'
    });
  } catch (error) {
    console.error('[send-code] 发送验证码异常:', error);
    return NextResponse.json({ 
      error: '发送失败，请稍后重试',
      hint: '服务异常，请联系管理员'
    }, { status: 500 });
  }
}
