import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

// 获取订阅列表
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const result = await execSql(
      `SELECT id, keywords, locations, salary_min, job_types, frequency, is_active, last_sent_at, created_at
       FROM job_subscriptions
       WHERE user_id = '${userId}'
       ORDER BY created_at DESC`
    );

    return NextResponse.json({
      success: true,
      data: (result || []).map((s: unknown) => {
        const subscription = s as {
          id: string;
          keywords: string[] | null;
          locations: string[] | null;
          salary_min: number | null;
          job_types: string[] | null;
          frequency: string;
          is_active: boolean;
          last_sent_at: string | null;
          created_at: string;
        };
        return {
          id: subscription.id,
          keywords: subscription.keywords || [],
          locations: subscription.locations || [],
          salaryMin: subscription.salary_min,
          jobTypes: subscription.job_types || [],
          frequency: subscription.frequency,
          isActive: subscription.is_active,
          lastSentAt: subscription.last_sent_at,
          createdAt: subscription.created_at
        };
      })
    });

  } catch (error) {
    console.error('获取订阅失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}

// 创建订阅
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const { keywords, locations, salaryMin, jobTypes, frequency } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    if (!keywords || keywords.length === 0) {
      return NextResponse.json(
        { error: '请至少选择一个关键词' },
        { status: 400 }
      );
    }

    const keywordsStr = `ARRAY[${keywords.map((k: string) => `'${k.replace(/'/g, "''")}'`).join(',')}]`;
    const locationsStr = locations && locations.length > 0 
      ? `ARRAY[${locations.map((l: string) => `'${l.replace(/'/g, "''")}'`).join(',')}]`
      : 'NULL';
    const jobTypesStr = jobTypes && jobTypes.length > 0 
      ? `ARRAY[${jobTypes.map((t: string) => `'${t}'`).join(',')}]`
      : 'NULL';

    const result = await execSql(
      `INSERT INTO job_subscriptions (user_id, keywords, locations, salary_min, job_types, frequency)
       VALUES ('${userId}', ${keywordsStr}, ${locationsStr}, ${salaryMin || 'NULL'}, ${jobTypesStr}, '${frequency || 'daily'}')
       RETURNING id`
    );

    return NextResponse.json({
      success: true,
      message: '订阅创建成功',
      data: { id: (result?.[0] as { id: string })?.id }
    });

  } catch (error) {
    console.error('创建订阅失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
