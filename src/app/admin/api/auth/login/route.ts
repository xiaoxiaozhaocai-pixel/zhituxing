import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';
import crypto from 'crypto';

// 简单的密码哈希（生产环境应使用bcrypt）
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// 管理员登录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { code: 400, message: '用户名和密码不能为空' },
        { status: 400 }
      );
    }

    const hashedPassword = hashPassword(password);

    // 查询管理员
    const admins = await execSql(`
      SELECT id, username, role FROM admin_users 
      WHERE username = '${username.replace(/'/g, "''")}' AND password = '${hashedPassword}'
    `) as Array<{ id: number; username: string; role: string }>;

    if (!admins || admins.length === 0) {
      return NextResponse.json(
        { code: 401, message: '用户名或密码错误' },
        { status: 401 }
      );
    }

    const admin = admins[0];

    // 更新最后登录时间
    await execSql(`
      UPDATE admin_users SET last_login_time = NOW() WHERE id = ${admin.id}
    `);

    // 记录登录日志
    await execSql(`
      INSERT INTO admin_operation_logs (admin_id, admin_username, operation_type, operation_content, ip_address)
      VALUES (${admin.id}, '${admin.username}', 'login', '管理员登录', '${request.headers.get('x-forwarded-for') || 'unknown'}')
    `);

    // 创建简单token（生产环境应使用JWT）
    const token = Buffer.from(`${admin.id}:${admin.username}:${Date.now()}`).toString('base64');

    return NextResponse.json({
      code: 200,
      message: '登录成功',
      data: {
        id: admin.id,
        username: admin.username,
        role: admin.role,
        token
      }
    });

  } catch (error) {
    console.error('管理员登录失败:', error);
    return NextResponse.json(
      { code: 500, message: '登录失败' },
      { status: 500 }
    );
  }
}

// 获取当前管理员信息
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { code: 401, message: '未登录' },
        { status: 401 }
      );
    }

    const token = Buffer.from(authHeader, 'base64').toString();
    const [id, username] = token.split(':');

    if (!id || !username) {
      return NextResponse.json(
        { code: 401, message: '无效的token' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      code: 200,
      data: {
        id: parseInt(id),
        username
      }
    });

  } catch (error) {
    return NextResponse.json(
      { code: 401, message: '未登录' },
      { status: 401 }
    );
  }
}
