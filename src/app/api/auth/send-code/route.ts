import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { checkRateLimit } from '@/lib/rate-limit';
export const dynamic = 'force-dynamic';

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

    // 双层频率限制：邮箱维度 3次/60s（键不含IP——防IP池轮换绕过轰炸）+ IP 全局维度 10次/小时
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || request.headers.get('x-real-ip') 
      || 'unknown';
    
    const byEmail = await checkRateLimit(`send-code:email:${email}`, { maxRequests: 3, windowMs: 60_000 });
    const byIp = await checkRateLimit(`send-code:ip:${clientIp}`, { maxRequests: 10, windowMs: 3_600_000 });
    if (!byEmail.success || !byIp.success) {
      return NextResponse.json({ 
        error: '发送过于频繁，请稍后再试',
        hint: byIp.success ? 'Supabase SMTP 有 60 秒最小发送间隔限制' : '当前网络发送次数已达上限，请1小时后再试',
        retryAfter: byEmail.success ? byIp.retryAfter : byEmail.retryAfter
      }, { status: 429 });
    }

    // 🧪 测试模式：DEV_OTP_BYPASS 开启时跳过真实邮件发送。
    // 安全护栏：生产构建（NODE_ENV=production）强制禁用，即使环境变量误配也无法启用后门
    if (process.env.DEV_OTP_BYPASS === 'true' && process.env.NODE_ENV !== 'production') {
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


    // 重发邮箱OTP验证码
    // 统一使用 signInWithOtp 方法，更可靠
    // - 对于已注册用户：发送 Magic Link / OTP
    // - 对于新用户：如果 shouldCreateUser=false，会返回错误
    const result = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: type === 'signup', // 注册时允许创建用户
        data: type === 'signup' ? { action: 'resend_signup' } : undefined,
      }
    });
    const error = result.error;

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
        // 防账号枚举：不暴露邮箱是否存在，与成功响应同文案
        return NextResponse.json({
          success: true,
          message: '验证码已发送到您的邮箱',
          hint: '若该邮箱已注册，请查收邮件（含垃圾箱）；未注册请先完成注册'
        });
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
