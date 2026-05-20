export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const supabase = getSupabaseAdmin();

// ============================================================
// 频率限制：IP + 手机号维度
// ============================================================
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxCount: number, windowMs: number): { allowed: boolean; resetAt: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);
  
  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, resetAt: now + windowMs };
  }
  
  if (record.count >= maxCount) {
    return { allowed: false, resetAt: record.resetAt };
  }
  
  record.count++;
  return { allowed: true, resetAt: record.resetAt };
}

// 获取客户端 IP
function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  const realIP = request.headers.get('x-real-ip');
  if (realIP) return realIP;
  return 'unknown';
}

// 定期清理过期的限流记录（每100次调用清理一次）
let cleanupCounter = 0;
function cleanupExpiredRecords() {
  cleanupCounter++;
  if (cleanupCounter % 100 === 0) {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      if (now > record.resetAt) {
        rateLimitStore.delete(key);
      }
    }
  }
}

// 发送验证码
export async function POST(request: NextRequest) {
  try {
    cleanupExpiredRecords();
    
    const body = await request.json();
    const { phone, email, type } = body;
    const targetPhone = phone || (email ? email.split('@')[0] : '');
    const effectiveType = type || 'login';
    const ip = getClientIP(request);

    if (!targetPhone) {
      return NextResponse.json({ error: '请输入手机号' }, { status: 400 });
    }

    // ============================================================
    // 频率限制检查
    // ============================================================
    // 同一手机号 60 秒内最多 1 次
    const phoneLimitKey = `phone:${targetPhone}`;
    const phoneLimit = checkRateLimit(phoneLimitKey, 1, 60 * 1000);
    if (!phoneLimit.allowed) {
      const retryAfter = Math.ceil((phoneLimit.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: `验证码发送过于频繁，请${retryAfter}秒后再试` },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }
    
    // 同一 IP 每分钟最多 5 次
    const ipLimitKey = `ip:${ip}`;
    const ipLimit = checkRateLimit(ipLimitKey, 5, 60 * 1000);
    if (!ipLimit.allowed) {
      const retryAfter = Math.ceil((ipLimit.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: `请求过于频繁，请${retryAfter}秒后再试` },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    // 生成验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟过期

    // 保存验证码
    const { error } = await supabase
      .from('verification_codes')
      .insert({
        phone: targetPhone,
        code,
        type: effectiveType,
        expires_at: expiresAt.toISOString(),
        used: false
      });

    if (error) {
      console.error('保存验证码失败:', error);
      return NextResponse.json({ error: '发送失败' }, { status: 500 });
    }

    // 实际发送验证码（这里模拟发送）
    console.log(`[验证码] ${targetPhone}: ${code}`);

    return NextResponse.json({
      success: true,
      message: '验证码已发送'
    });
  } catch (error) {
    console.error('发送验证码失败:', error);
    return NextResponse.json({ error: '发送失败' }, { status: 500 });
  }
}
