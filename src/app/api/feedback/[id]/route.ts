import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

// 获取反馈详情
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

    const result = await execSql(
      `SELECT 
        id, type, title, content, contact, images, status,
        admin_reply, replied_at, created_at, updated_at
       FROM feedback
       WHERE id = '${id}' AND user_id = '${userId}'`
    );

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: '反馈不存在' },
        { status: 404 }
      );
    }

    const feedback = result[0] as {
      id: string;
      type: string;
      title: string;
      content: string;
      contact: string | null;
      images: string[] | null;
      status: string;
      admin_reply: string | null;
      replied_at: string | null;
      created_at: string;
      updated_at: string;
    };

    return NextResponse.json({
      success: true,
      data: {
        id: feedback.id,
        type: feedback.type,
        title: feedback.title,
        content: feedback.content,
        contact: feedback.contact,
        images: feedback.images || [],
        status: feedback.status,
        admin_reply: feedback.admin_reply,
        replied_at: feedback.replied_at,
        created_at: feedback.created_at,
        updated_at: feedback.updated_at
      }
    });

  } catch (error) {
    console.error('获取反馈详情失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
