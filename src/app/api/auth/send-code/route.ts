import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 发送验证码
export async function POST(request: NextRequest) {
  try {
    const { phone, type = 'login' } = await request.json();

    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return NextResponse.json(
        { error: '请输入正确的手机号' },
        { status: 400 }
      );
    }

    // 生成6位验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 设置过期时间（5分钟后）
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // 先删除该手机号之前的验证码
    await supabase
      .from('verification_codes')
      .delete()
      .eq('phone', phone)
      .eq('used', false);

    // 保存新验证码
    const { error: insertError } = await supabase
      .from('verification_codes')
      .insert({
        phone,
        code,
        type,
        expires_at: expiresAt,
        used: false
      });

    if (insertError) {
      console.error('保存验证码失败:', insertError);
      return NextResponse.json(
        { error: '发送验证码失败' },
        { status: 500 }
      );
    }

    // TODO: 实际应该调用短信API发送验证码
    // 这里为了演示，直接返回验证码
    console.log(`验证码已发送至 ${phone}: ${code}`);

    return NextResponse.json({
      success: true,
      message: '验证码已发送',
      // 开发环境下返回验证码，方便测试
      code: process.env.NODE_ENV === 'development' ? code : undefined
    });

  } catch (error) {
    console.error('发送验证码失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
