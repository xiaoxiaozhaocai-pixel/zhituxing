import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

// 保存对话消息
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const { history_id, bot_type, role, content } = await request.json();

    if (!role || !content) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    let historyId = history_id;

    // 如果没有历史ID，创建新的对话记录
    if (!historyId) {
      if (!bot_type) {
        return NextResponse.json(
          { error: '缺少bot_type参数' },
          { status: 400 }
        );
      }

      // 创建新对话
      const firstMessage = content.slice(0, 200);
      const createResult = await execSql(
        `INSERT INTO chat_histories (user_id, bot_type, title, first_message, message_count, last_message)
         VALUES ('${userId}', '${bot_type}', '${firstMessage}', '${firstMessage}', 1, '${content.slice(0, 500)}')
         RETURNING id`
      );

      if (!createResult || createResult.length === 0) {
        return NextResponse.json(
          { error: '创建对话失败' },
          { status: 500 }
        );
      }

      historyId = (createResult[0] as { id: string }).id;
    }

    // 保存消息
    const messageResult = await execSql(
      `INSERT INTO chat_messages (history_id, role, content)
       VALUES ('${historyId}', '${role}', '${content.replace(/'/g, "''")}')
       RETURNING id, created_at`
    );

    // 更新对话统计
    await execSql(
      `UPDATE chat_histories 
       SET message_count = message_count + 1,
           last_message = '${content.slice(0, 500).replace(/'/g, "''")}',
           updated_at = NOW()
       WHERE id = '${historyId}'`
    );

    if (!messageResult || messageResult.length === 0) {
      return NextResponse.json(
        { error: '保存消息失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        message_id: (messageResult[0] as { id: string }).id,
        history_id: historyId,
        created_at: (messageResult[0] as { created_at: string }).created_at
      }
    });

  } catch (error) {
    console.error('保存消息失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
