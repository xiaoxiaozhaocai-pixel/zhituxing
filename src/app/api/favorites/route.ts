import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

// 获取收藏列表
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

    const result = await execSql(
      `SELECT id, job_id, job_title, company, salary, location, source, created_at
       FROM job_favorites
       WHERE user_id = '${userId}'
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}`
    );

    // 获取总数
    const countResult = await execSql(
      `SELECT COUNT(*) as total FROM job_favorites WHERE user_id = '${userId}'`
    );
    const total = countResult && countResult.length > 0 
      ? parseInt((countResult[0] as { total: string }).total) || 0 
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        favorites: (result || []).map((f: unknown) => {
          const favorite = f as {
            id: string;
            job_id: string;
            job_title: string;
            company: string | null;
            salary: string | null;
            location: string | null;
            source: string | null;
            created_at: string;
          };
          return {
            id: favorite.id,
            jobId: favorite.job_id,
            jobTitle: favorite.job_title,
            company: favorite.company,
            salary: favorite.salary,
            location: favorite.location,
            source: favorite.source,
            createdAt: favorite.created_at
          };
        }),
        total
      }
    });

  } catch (error) {
    console.error('获取收藏失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}

// 添加收藏
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const { jobId, jobTitle, company, salary, location, source } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    if (!jobId || !jobTitle) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const result = await execSql(
      `INSERT INTO job_favorites (user_id, job_id, job_title, company, salary, location, source)
       VALUES ('${userId}', '${jobId}', '${jobTitle.replace(/'/g, "''")}', ${company ? `'${company.replace(/'/g, "''")}'` : 'NULL'}, ${salary ? `'${salary.replace(/'/g, "''")}'` : 'NULL'}, ${location ? `'${location.replace(/'/g, "''")}'` : 'NULL'}, ${source ? `'${source}'` : 'NULL'})
       ON CONFLICT (user_id, job_id) DO UPDATE SET job_title = EXCLUDED.job_title, company = EXCLUDED.company
       RETURNING id`
    );

    return NextResponse.json({
      success: true,
      message: '收藏成功',
      data: { id: (result?.[0] as { id: string })?.id }
    });

  } catch (error) {
    console.error('添加收藏失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
