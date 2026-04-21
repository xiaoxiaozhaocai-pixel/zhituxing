import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { execSql } from '@/lib/exec-sql';

// 登录
export async function POST(request: NextRequest) {
  try {
    const { phone, password, code } = await request.json();

    // 验证必填项（密码登录或验证码登录二选一）
    if (!phone) {
      return NextResponse.json(
        { error: '请输入手机号' },
        { status: 400 }
      );
    }

    // 密码登录
    if (password) {
      if (!/^1[3-9]\d{9}$/.test(phone)) {
        return NextResponse.json(
          { error: '请输入正确的手机号' },
          { status: 400 }
        );
      }

      if (password.length < 6) {
        return NextResponse.json(
          { error: '密码至少6位' },
          { status: 400 }
        );
      }

      // 查询用户
      const userResult = await execSql(
        `SELECT * FROM users WHERE phone = '${phone}' LIMIT 1`
      );

      if (!userResult || userResult.length === 0) {
        return NextResponse.json(
          { error: '用户不存在，请先注册' },
          { status: 401 }
        );
      }

      const user = userResult[0] as {
        id: string;
        phone: string;
        nickname: string;
        avatar_url?: string;
        created_at: string;
        password?: string;
      };

      // 验证密码
      if (!user.password) {
        return NextResponse.json(
          { error: '请使用验证码登录' },
          { status: 401 }
        );
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return NextResponse.json(
          { error: '密码错误' },
          { status: 401 }
        );
      }

      // 返回用户信息
      const userInfo = {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatar_url: user.avatar_url,
        created_at: user.created_at
      };

      return NextResponse.json({
        success: true,
        message: '登录成功',
        user: userInfo
      });
    }

    // 验证码登录
    if (code) {
      if (!/^1[3-9]\d{9}$/.test(phone)) {
        return NextResponse.json(
          { error: '请输入正确的手机号' },
          { status: 400 }
        );
      }

      // 查询验证码
      const verifyResult = await execSql(
        `SELECT * FROM verification_codes WHERE phone = '${phone}' AND type = 'login' AND used = false ORDER BY created_at DESC LIMIT 1`
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

      // 查询用户
      let userResult = await execSql(
        `SELECT * FROM users WHERE phone = '${phone}' LIMIT 1`
      );

      if (!userResult || userResult.length === 0) {
        // 如果用户不存在，自动注册
        userResult = await execSql(
          `INSERT INTO users (phone, nickname) VALUES ('${phone}', '用户${phone.slice(-4)}') RETURNING *`
        );

        if (!userResult || userResult.length === 0) {
          return NextResponse.json(
            { error: '登录失败' },
            { status: 500 }
          );
        }
      }

      const user = userResult[0] as {
        id: string;
        phone: string;
        nickname: string;
        avatar_url?: string;
        created_at: string;
      };

      // 返回用户信息
      const userInfo = {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatar_url: user.avatar_url,
        created_at: user.created_at
      };

      return NextResponse.json({
        success: true,
        message: '登录成功',
        user: userInfo
      });
    }

    return NextResponse.json(
      { error: '请提供密码或验证码' },
      { status: 400 }
    );

  } catch (error) {
    console.error('登录失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
