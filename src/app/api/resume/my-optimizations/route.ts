import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

// 获取用户的简历优化记录
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
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 获取优化记录
    const result = await execSql(
      `SELECT 
        id,
        target_position,
        original_content,
        optimized_content,
        suggestions,
        status,
        created_at,
        updated_at
       FROM resume_optimizations
       WHERE user_id = '${userId}'
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}`
    );

    // 获取总数
    const countResult = await execSql(
      `SELECT COUNT(*) as total FROM resume_optimizations WHERE user_id = '${userId}'`
    );

    const total = countResult && countResult.length > 0 
      ? parseInt((countResult[0] as { total: string }).total) || 0 
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        records: (result || []).map((r: unknown) => {
          const record = r as {
            id: string;
            target_position: string;
            original_content: string;
            optimized_content: string;
            suggestions: string;
            status: string;
            created_at: string;
            updated_at: string;
          };
          return {
            id: record.id,
            target_position: record.target_position,
            preview: record.original_content?.slice(0, 100) || '',
            suggestions: record.suggestions ? JSON.parse(record.suggestions) : [],
            status: record.status,
            created_at: record.created_at,
            updated_at: record.updated_at
          };
        }),
        total,
        has_more: offset + limit < total
      }
    });

  } catch (error) {
    console.error('获取优化记录失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
