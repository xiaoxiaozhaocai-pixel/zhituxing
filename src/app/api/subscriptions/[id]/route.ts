import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

// 更新订阅
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    const { keywords, locations, salaryMin, jobTypes, frequency, isActive } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const updates: string[] = [];
    if (keywords) {
      updates.push(`keywords = ARRAY[${keywords.map((k: string) => `'${k.replace(/'/g, "''")}'`).join(',')}]`);
    }
    if (locations) {
      updates.push(`locations = ARRAY[${locations.map((l: string) => `'${l.replace(/'/g, "''")}'`).join(',')}]`);
    }
    if (salaryMin !== undefined) {
      updates.push(`salary_min = ${salaryMin || 'NULL'}`);
    }
    if (jobTypes) {
      updates.push(`job_types = ARRAY[${jobTypes.map((t: string) => `'${t}'`).join(',')}]`);
    }
    if (frequency) {
      updates.push(`frequency = '${frequency}'`);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = ${isActive}`);
    }
    updates.push(`updated_at = NOW()`);

    const result = await execSql(
      `UPDATE job_subscriptions 
       SET ${updates.join(', ')}
       WHERE id = '${id}' AND user_id = '${userId}'
       RETURNING id`
    );

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: '订阅不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '订阅已更新'
    });

  } catch (error) {
    console.error('更新订阅失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}

// 删除订阅
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
      `DELETE FROM job_subscriptions WHERE id = '${id}' AND user_id = '${userId}' RETURNING id`
    );

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: '订阅不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '订阅已取消'
    });

  } catch (error) {
    console.error('删除订阅失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
