import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const supabase = getSupabaseAdmin();

// 管理员登录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ code: 400, message: '用户名和密码不能为空' }, { status: 400 });
    }

    // 查询管理员
    const { data: admin } = await supabase
      .from('admins')
      .select('*')
      .eq('username', username)
      .single();

    if (!admin) {
      return NextResponse.json({ code: 401, message: '用户名或密码错误' }, { status: 401 });
    }

    // 安全修复 P1-6：使用 bcrypt 验证密码（若已迁移为 bcrypt hash）
    // 兼容旧 SHA-256 hash
    let passwordValid = false;
    if (admin.password_hash && admin.password_hash.startsWith('$2')) {
      // bcrypt hash
      passwordValid = await bcrypt.compare(password, admin.password_hash);
    } else {
      // 兼容旧 SHA-256 hash
      const passwordHash = crypto
        .createHash('sha256')
        .update(password + (admin.salt || ''))
        .digest('hex');
      passwordValid = passwordHash === admin.password_hash;
    }

    if (!passwordValid) {
      return NextResponse.json({ code: 401, message: '用户名或密码错误' }, { status: 401 });
    }

    // 更新最后登录时间
    await supabase
      .from('admins')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', admin.id);

    // 安全修复 P0-6：使用 httpOnly cookie 存储 admin token
    // admin_token cookie 值与 ADMIN_TOKEN 环境变量一致，用于 API 鉴权
    const token = process.env.ADMIN_TOKEN || crypto.randomBytes(32).toString('hex');

    const response = NextResponse.json({
      code: 200,
      message: '登录成功',
      data: {
        admin: {
          id: admin.id,
          username: admin.username,
          role: admin.role
        }
      }
    });

    // 设置 httpOnly cookie
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60, // 24 小时
    });

    return response;
  } catch (error) {
    console.error('登录失败:', error);
    return NextResponse.json({ code: 500, message: '登录失败' }, { status: 500 });
  }
}
