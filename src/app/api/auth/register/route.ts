import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { execSql } from '@/lib/exec-sql';

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
    const verifyResult = await execSql(
      `SELECT * FROM verification_codes WHERE phone = '${phone}' AND type = 'register' AND used = false ORDER BY created_at DESC LIMIT 1`
    );

    if (!verifyResult || verifyResult.length === 0) {
      return NextResponse.json(
        { error: '请先获取验证码' },
        { status: 400 }
      );
    }

    const verification = verifyResult[0] as {
      id: string;
      code: string;
      expires_at: string;
    };

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
    await execSql(`UPDATE verification_codes SET used = true WHERE id = '${verification.id}'`);

    // 检查用户是否已存在
    const userCheck = await execSql(`SELECT id FROM users WHERE phone = '${phone}' LIMIT 1`);
    if (userCheck && userCheck.length > 0) {
      return NextResponse.json(
        { error: '该手机号已注册，请直接登录' },
        { status: 400 }
      );
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);
    const userNickname = nickname || `用户${phone.slice(-4)}`;

    // 创建用户（不使用RETURNING）
    await execSql(
      `INSERT INTO users (phone, password, nickname) VALUES ('${phone}', '${hashedPassword}', '${userNickname}')`
    );

    // 查询新创建的用户
    const userResult = await execSql(
      `SELECT id, phone, nickname, created_at FROM users WHERE phone = '${phone}' LIMIT 1`
    );

    if (!userResult || userResult.length === 0) {
      return NextResponse.json(
        { error: '注册失败' },
        { status: 500 }
      );
    }

    const newUser = userResult[0] as {
      id: string;
      phone: string;
      nickname: string;
      created_at: string;
    };

    // 返回用户信息
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
