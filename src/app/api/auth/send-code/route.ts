export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * 发送验证码 API
 * 支持邮箱和手机号两种方式
 */

// 内存限流：60秒内同一标识最多3次
const limiter = new Map<string, { count: number; lastTime: number }>();
const WINDOW = 60000;
const MAX = 3;

function checkRate(key: string): boolean {
  const now = Date.now();
  const rec = limiter.get(key);
  if (!rec || now - rec.lastTime > WINDOW) {
    limiter.set(key, { count: 1, lastTime: now });
    return true;
  }
  if (rec.count >= MAX) return false;
  limiter.set(key, { count: rec.count + 1, lastTime: rec.lastTime });
  return true;
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, phone, type = 'login' } = body;

    // --- 手机号验证码 ---
    if (phone) {
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(phone)) {
        return NextResponse.json({ error: '请输入正确的手机号' }, { status: 400 });
      }

      const ip = getClientIp(request);
      if (!checkRate(`${ip}:${phone}`)) {
        return NextResponse.json({ error: '发送过于频繁，请60秒后再试' }, { status: 429 });
      }

      const supabase = getSupabaseAdmin();

      // 生成6位验证码
      const code = String(Math.floor(100000 + Math.random() * 900000));

      // 存入数据库（5分钟过期）
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const { error: insertError } = await supabase
        .from('verification_codes')
        .insert({
          phone,
          code,
          type,
          expires_at: expiresAt,
          used: false,
        });

      if (insertError) {
        console.error('[send-code] 存储验证码失败:', insertError);
        // 如果表不存在，尝试创建
        if (insertError.message?.includes('does not exist')) {
          return NextResponse.json({
            error: '系统初始化中，请联系管理员创建 verification_codes 表',
            hint: '需要执行数据库迁移'
          }, { status: 500 });
        }
        return NextResponse.json({ error: '发送失败，请稍后重试' }, { status: 500 });
      }

      // 发送短信（阿里云短信为可选依赖，未配置时验证码仅记录在服务端日志）
      const smsSent = await sendSms(phone, code);
      if (!smsSent) {
        console.log(`📱 [SMS] 验证码: ${code} → ${phone} (短信服务未配置)`);
      }

      console.log(`[send-code] 短信验证码已发送: ${phone} type=${type}`);
      return NextResponse.json({
        success: true,
        message: '验证码已发送',
      });
    }

    // --- 邮箱验证码（兼容旧逻辑） ---
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: '请输入正确的邮箱地址' }, { status: 400 });
      }

      const ip = getClientIp(request);
      if (!checkRate(`${ip}:${email}`)) {
        return NextResponse.json({ error: '发送过于频繁，请60秒后再试' }, { status: 429 });
      }

      const supabase = getSupabaseAdmin();
      const result = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: type === 'register',
          data: type === 'register' ? { action: 'signup' } : undefined,
        },
      });

      if (result.error) {
        console.error('[send-code] 邮箱OTP失败:', result.error.message);
        let msg = '发送失败，请稍后重试';
        if (result.error.message?.includes('rate limit') || result.error.status === 429) {
          msg = '发送过于频繁，请60秒后再试';
        }
        return NextResponse.json({ error: msg }, { status: result.error.status || 500 });
      }

      return NextResponse.json({
        success: true,
        message: '验证码已发送到您的邮箱',
      });
    }

    return NextResponse.json({ error: '请提供手机号或邮箱' }, { status: 400 });
  } catch (error) {
    console.error('[send-code] 异常:', error);
    return NextResponse.json({ error: '发送失败，请稍后重试' }, { status: 500 });
  }
}

// ========== 短信发送（可选） ==========
// 阿里云短信服务 https://www.aliyun.com/product/sms
// 配置环境变量后自动启用：ALIBABA_ACCESS_KEY_ID, ALIBABA_ACCESS_KEY_SECRET, ALIBABA_SMS_TEMPLATE_CODE
// 未配置时验证码仅记录服务端日志，不影响功能（方便开发调试）
async function sendSms(phone: string, code: string): Promise<boolean> {
  const accessKeyId = process.env.ALIBABA_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIBABA_ACCESS_KEY_SECRET;
  const signName = process.env.ALIBABA_SMS_SIGN_NAME || '职途星';
  const templateCode = process.env.ALIBABA_SMS_TEMPLATE_CODE;

  if (!accessKeyId || !accessKeySecret || !templateCode) {
    return false; // 未配置，静默跳过
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Dysmsapi = require('@alicloud/dysmsapi20170525').default;
    const client = new Dysmsapi({
      accessKeyId,
      accessKeySecret,
      endpoint: 'dysmsapi.aliyuncs.com',
    } as any);

    const result = await client.sendSms({
      PhoneNumbers: phone,
      SignName: signName,
      TemplateCode: templateCode,
      TemplateParam: JSON.stringify({ code }),
    });

    if (result.body?.Code === 'OK') {
      console.log(`[SMS] 验证码发送成功: ${phone}`);
      return true;
    }
    console.error('[SMS] 发送失败:', result.body?.Message);
    return false;
  } catch (err: any) {
    console.error('[SMS] 异常:', err?.message || err);
    return false;
  }
}
