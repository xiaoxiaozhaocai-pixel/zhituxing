import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

// 获取通知列表
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let whereClause = `WHERE (user_id = '${userId}' OR is_global = TRUE)`;
    if (status) {
      whereClause += ` AND status = '${status}'`;
    }

    // 获取通知列表
    const result = await execSql(
      `SELECT 
        id,
        user_id,
        title,
        content,
        type,
        status,
        is_global,
        created_at
       FROM notifications
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}`
    );

    // 获取未读数量
    const unreadResult = await execSql(
      `SELECT COUNT(*) as unread FROM notifications 
       WHERE (user_id = '${userId}' OR is_global = TRUE) AND status = 'unread'`
    );

    const unread = unreadResult && unreadResult.length > 0 
      ? parseInt((unreadResult[0] as { unread: string }).unread) || 0 
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        notifications: (result || []).map((n: unknown) => {
          const notification = n as {
            id: string;
            user_id: string;
            title: string;
            content: string;
            type: string;
            status: string;
            is_global: boolean;
            created_at: string;
          };
          return {
            id: notification.id,
            title: notification.title,
            content: notification.content,
            type: notification.type,
            status: notification.status,
            is_global: notification.is_global,
            created_at: notification.created_at
          };
        }),
        unread
      }
    });

  } catch (error) {
    console.error('获取通知失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}

// 发送通知（内部使用）
export async function POST(request: NextRequest) {
  try {
    const { title, content, type = 'system', userId, isGlobal = false } = await request.json();

    if (!title || !content) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    if (!userId && !isGlobal) {
      return NextResponse.json(
        { error: '必须指定用户ID或设置isGlobal=true' },
        { status: 400 }
      );
    }

    // 创建通知
    const result = await execSql(
      `INSERT INTO notifications (user_id, title, content, type, is_global)
       VALUES (${userId ? `'${userId}'` : 'NULL'}, '${title.replace(/'/g, "''")}', '${content.replace(/'/g, "''")}', '${type}', ${isGlobal})
       RETURNING id, created_at`
    );

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: '发送失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '通知已发送',
      data: {
        id: (result[0] as { id: string }).id
      }
    });

  } catch (error) {
    console.error('发送通知失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
