import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

// 标记全部通知为已读
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    // 更新所有未读通知
    await execSql(
      `UPDATE notifications 
       SET status = 'read'
       WHERE (user_id = '${userId}' OR is_global = TRUE) AND status = 'unread'`
    );

    return NextResponse.json({
      success: true,
      message: '全部已标记为已读'
    });

  } catch (error) {
    console.error('标记已读失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
