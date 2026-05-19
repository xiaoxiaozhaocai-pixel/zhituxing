import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import crypto from 'crypto';

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

    // 验证密码
    const passwordHash = crypto
      .createHash('sha256')
      .update(password + (admin.salt || ''))
      .digest('hex');

    if (passwordHash !== admin.password_hash) {
      return NextResponse.json({ code: 401, message: '用户名或密码错误' }, { status: 401 });
    }

    // 更新最后登录时间
    await supabase
      .from('admins')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', admin.id);

    // 生成token
    const token = crypto
      .createHash('sha256')
      .update(`${admin.id}-${Date.now()}-${Math.random()}`)
      .digest('hex');

    return NextResponse.json({
      code: 200,
      message: '登录成功',
      data: {
        token,
        admin: {
          id: admin.id,
          username: admin.username,
          role: admin.role
        }
      }
    });
  } catch (error) {
    console.error('登录失败:', error);
    return NextResponse.json({ code: 500, message: '登录失败' }, { status: 500 });
  }
}
