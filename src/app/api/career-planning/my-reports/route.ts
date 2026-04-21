import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

// 获取我的职业规划报告列表
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { code: 401, message: '请先登录', data: null },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const offset = (page - 1) * pageSize;

    // 获取总数
    const countResult = await execSql(`
      SELECT COUNT(*) as total FROM career_planning_reports WHERE user_id = '${userId}'
    `);
    const total = (countResult as Array<{total: number}>)?.[0]?.total || 0;

    // 获取列表
    const listResult = await execSql(`
      SELECT 
        id, user_id, major, grade, city, is_latest, create_time
      FROM career_planning_reports 
      WHERE user_id = '${userId}'
      ORDER BY create_time DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `);

    // 状态映射
    const statusMap: Record<number, string> = {
      0: '历史',
      1: '最新'
    };

    const list = (listResult as Array<Record<string, unknown>> || []).map((item) => ({
      id: item.id,
      major: item.major || '未填写',
      grade: item.grade,
      city: item.city || '全国',
      is_latest: item.is_latest,
      status: statusMap[item.is_latest as number] || '历史',
      create_time: item.create_time,
      // 核心岗位（从report_data中提取，暂无则显示占位）
      core_job: item.is_latest ? '产品经理' : '—'
    }));

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        list,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    });

  } catch (error) {
    console.error('获取报告列表失败:', error);
    return NextResponse.json(
      { code: 500, message: '获取失败', data: null },
      { status: 500 }
    );
  }
}
