import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

// 获取用户的对话历史列表
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
    const botType = searchParams.get('bot_type');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let whereClause = `WHERE h.user_id = '${userId}'`;
    if (botType) {
      whereClause += ` AND h.bot_type = '${botType}'`;
    }

    // 获取对话历史列表
    const result = await execSql(
      `SELECT 
        h.id,
        h.bot_type,
        h.title,
        h.first_message,
        h.message_count,
        h.last_message,
        h.created_at,
        h.updated_at
       FROM chat_histories h
       ${whereClause}
       ORDER BY h.updated_at DESC
       LIMIT ${limit} OFFSET ${offset}`
    );

    // 获取总数
    const countResult = await execSql(
      `SELECT COUNT(*) as total FROM chat_histories h ${whereClause}`
    );

    const total = countResult && countResult.length > 0 
      ? parseInt((countResult[0] as { total: string }).total) || 0 
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        histories: (result || []).map((h: unknown) => {
          const history = h as {
            id: string;
            bot_type: string;
            title: string;
            first_message: string;
            message_count: number;
            last_message: string;
            created_at: string;
            updated_at: string;
          };
          return {
            id: history.id,
            bot_type: history.bot_type,
            title: history.title || history.first_message?.slice(0, 50) || '新对话',
            preview: history.last_message?.slice(0, 100) || '',
            message_count: history.message_count,
            created_at: history.created_at,
            updated_at: history.updated_at
          };
        }),
        total,
        has_more: offset + limit < total
      }
    });

  } catch (error) {
    console.error('获取对话历史失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
