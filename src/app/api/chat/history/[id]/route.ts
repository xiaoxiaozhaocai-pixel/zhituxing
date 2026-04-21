import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

// 获取单条对话详情
export async function GET(
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

    // 获取对话信息
    const historyResult = await execSql(
      `SELECT 
        h.id,
        h.bot_type,
        h.title,
        h.user_id,
        h.created_at,
        h.updated_at
       FROM chat_histories h
       WHERE h.id = '${id}' AND h.user_id = '${userId}'
       LIMIT 1`
    );

    if (!historyResult || historyResult.length === 0) {
      return NextResponse.json(
        { error: '对话不存在' },
        { status: 404 }
      );
    }

    const history = historyResult[0] as {
      id: string;
      bot_type: string;
      title: string;
      user_id: string;
      created_at: string;
      updated_at: string;
    };

    // 获取消息列表
    const messagesResult = await execSql(
      `SELECT 
        id,
        role,
        content,
        created_at
       FROM chat_messages
       WHERE history_id = '${id}'
       ORDER BY created_at ASC`
    );

    return NextResponse.json({
      success: true,
      data: {
        id: history.id,
        bot_type: history.bot_type,
        title: history.title,
        created_at: history.created_at,
        updated_at: history.updated_at,
        messages: (messagesResult || []).map((m: unknown) => {
          const msg = m as { id: string; role: string; content: string; created_at: string };
          return {
            id: msg.id,
            role: msg.role,
            content: msg.content,
            created_at: msg.created_at
          };
        })
      }
    });

  } catch (error) {
    console.error('获取对话详情失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}

// 删除对话
export async function DELETE(
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

    // 验证权限并删除
    const result = await execSql(
      `DELETE FROM chat_histories 
       WHERE id = '${id}' AND user_id = '${userId}'
       RETURNING id`
    );

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: '对话不存在或无权删除' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '对话已删除'
    });

  } catch (error) {
    console.error('删除对话失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
