import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

// 登录
export async function POST(request: NextRequest) {
  try {
    const { phone, password, code } = await request.json();

    // 验证必填项（密码或验证码二选一）
    if (!phone) {
      return NextResponse.json(
        { error: '请输入手机号' },
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

    // 查询用户
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('phone', phone)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: '该手机号未注册' },
        { status: 401 }
      );
    }

    // 如果使用密码登录
    if (password) {
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        return NextResponse.json(
          { error: '密码错误' },
          { status: 401 }
        );
      }
    } 
    // 如果使用验证码登录
    else if (code) {
      // 查询验证码
      const { data: verification, error: verifyError } = await supabase
        .from('verification_codes')
        .select('*')
        .eq('phone', phone)
        .eq('type', 'login')
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
    } else {
      return NextResponse.json(
        { error: '请输入密码或验证码' },
        { status: 400 }
      );
    }

    // 生成简单的session token（实际生产应该用JWT）
    const sessionToken = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');

    // 返回用户信息（不包含密码）
    const userInfo = {
      id: user.id,
      phone: user.phone,
      nickname: user.nickname,
      avatar_url: user.avatar_url,
      created_at: user.created_at
    };

    const response = NextResponse.json({
      success: true,
      message: '登录成功',
      user: userInfo
    });

    // 设置cookie
    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7天
      path: '/'
    });

    response.cookies.set('user_id', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('登录失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
