import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

// 注册
export async function POST(request: NextRequest) {
  try {
    const { phone, password, code, nickname } = await request.json();

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

    // 查询验证码
    const { data: verification, error: verifyError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('phone', phone)
      .eq('type', 'register')
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (verifyError || !verification) {
      return NextResponse.json(
        { error: '请先获取验证码' },
        { status: 400 }
      );
    }

    // 检查验证码是否过期
    if (new Date(verification.expires_at) < new Date()) {
      return NextResponse.json(
        { error: '验证码已过期，请重新获取' },
        { status: 400 }
      );
    }

    // 验证验证码是否正确
    if (verification.code !== code) {
      return NextResponse.json(
        { error: '验证码错误' },
        { status: 400 }
      );
    }

    // 标记验证码已使用
    await supabase
      .from('verification_codes')
      .update({ used: true })
      .eq('id', verification.id);

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 检查用户是否已存在
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('phone', phone)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: '该手机号已注册，请直接登录' },
        { status: 400 }
      );
    }

    // 创建用户
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        phone,
        password: hashedPassword,
        nickname: nickname || `用户${phone.slice(-4)}`
      })
      .select()
      .single();

    if (createError) {
      console.error('创建用户失败:', createError);
      return NextResponse.json(
        { error: '注册失败' },
        { status: 500 }
      );
    }

    // 返回用户信息（不包含密码）
    const userInfo = {
      id: newUser.id,
      phone: newUser.phone,
      nickname: newUser.nickname,
      created_at: newUser.created_at
    };

    return NextResponse.json({
      success: true,
      message: '注册成功',
      user: userInfo
    });

  } catch (error) {
    console.error('注册失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
