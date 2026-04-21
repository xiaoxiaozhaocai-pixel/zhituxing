import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

// 获取简历优化详情
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

    // 获取详情
    const result = await execSql(
      `SELECT 
        id,
        user_id,
        target_position,
        original_content,
        optimized_content,
        suggestions,
        status,
        created_at,
        updated_at
       FROM resume_optimizations
       WHERE id = '${id}' AND user_id = '${userId}'
       LIMIT 1`
    );

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: '记录不存在' },
        { status: 404 }
      );
    }

    const record = result[0] as {
      id: string;
      user_id: string;
      target_position: string;
      original_content: string;
      optimized_content: string;
      suggestions: string;
      status: string;
      created_at: string;
      updated_at: string;
    };

    return NextResponse.json({
      success: true,
      data: {
        id: record.id,
        target_position: record.target_position,
        original_content: record.original_content,
        optimized_content: record.optimized_content,
        suggestions: record.suggestions ? JSON.parse(record.suggestions) : [],
        status: record.status,
        created_at: record.created_at,
        updated_at: record.updated_at
      }
    });

  } catch (error) {
    console.error('获取详情失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
