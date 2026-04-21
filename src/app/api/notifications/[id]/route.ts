import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

// 标记通知为已读
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    // 检查是否是特殊路径
    if (id === 'read-all') {
      // 标记全部已读
      await execSql(
        `UPDATE notifications 
         SET status = 'read'
         WHERE (user_id = '${userId}' OR is_global = TRUE) AND status = 'unread'`
      );
      return NextResponse.json({
        success: true,
        message: '全部已标记为已读'
      });
    }

    // 更新单条通知
    const result = await execSql(
      `UPDATE notifications 
       SET status = 'read'
       WHERE id = '${id}' AND (user_id = '${userId}' OR is_global = TRUE)
       RETURNING id`
    );

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: '通知不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '已标记为已读'
    });

  } catch (error) {
    console.error('标记已读失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
