import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

// 获取反馈列表（用户只能查看自己的）
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

    let whereClause = `WHERE user_id = '${userId}'`;
    if (status) {
      whereClause += ` AND status = '${status}'`;
    }

    const result = await execSql(
      `SELECT 
        id, type, title, content, contact, images, status,
        admin_reply, replied_at, created_at
       FROM feedback
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}`
    );

    return NextResponse.json({
      success: true,
      data: (result || []).map((f: unknown) => {
        const feedback = f as {
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
        };
        return {
          id: feedback.id,
          type: feedback.type,
          title: feedback.title,
          content: feedback.content,
          contact: feedback.contact,
          images: feedback.images || [],
          status: feedback.status,
          admin_reply: feedback.admin_reply,
          replied_at: feedback.replied_at,
          created_at: feedback.created_at
        };
      })
    });

  } catch (error) {
    console.error('获取反馈失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}

// 提交反馈
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const { type, title, content, contact, images } = await request.json();

    if (!type || !title || !content) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const imagesStr = images && images.length > 0 
      ? `ARRAY[${images.map((img: string) => `'${img.replace(/'/g, "''")}'`).join(',')}]::TEXT[]`
      : 'NULL';

    const result = await execSql(
      `INSERT INTO feedback (user_id, type, title, content, contact, images)
       VALUES ('${userId}', '${type}', '${title.replace(/'/g, "''")}', '${content.replace(/'/g, "''")}', ${contact ? `'${contact}'` : 'NULL'}, ${imagesStr})
       RETURNING id, created_at`
    );

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: '提交失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '反馈已提交，我们会尽快处理',
      data: {
        id: (result[0] as { id: string }).id
      }
    });

  } catch (error) {
    console.error('提交反馈失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
