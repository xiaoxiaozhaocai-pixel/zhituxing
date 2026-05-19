export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const supabase = getSupabaseAdmin();

// 发送验证码
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, email, type } = body;
    const targetPhone = phone || (email ? email.split('@')[0] : '');
    const effectiveType = type || 'login';

    if (!targetPhone) {
      return NextResponse.json({ error: '请输入手机号' }, { status: 400 });
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
