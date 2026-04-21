import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

// 获取当前用户
export async function GET(request: NextRequest) {
  try {
    // 从请求头获取用户ID
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      );
    }

    // 查询用户信息
    const result = await execSql(
      `SELECT id, phone, nickname, avatar_url, created_at FROM users WHERE id = '${userId}' LIMIT 1`
    );

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    const user = result[0];

    return NextResponse.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('获取用户信息失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
