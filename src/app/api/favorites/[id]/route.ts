import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

// 删除收藏
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

    const result = await execSql(
      `DELETE FROM job_favorites WHERE id = '${id}' AND user_id = '${userId}' RETURNING id`
    );

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: '收藏不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '已取消收藏'
    });

  } catch (error) {
    console.error('删除收藏失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}

// 检查是否已收藏
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
      `SELECT id FROM job_favorites WHERE user_id = '${userId}' AND job_id = '${id}'`
    );

    return NextResponse.json({
      success: true,
      data: {
        isFavorited: result && result.length > 0
      }
    });

  } catch (error) {
    console.error('检查收藏失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
