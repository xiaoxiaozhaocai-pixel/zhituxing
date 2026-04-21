import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

// 生成职业规划报告
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { code: 401, message: '请先登录', data: null },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { major, grade, city } = body;

    // 验证必填字段
    if (!grade) {
      return NextResponse.json(
        { code: 400, message: '请选择年级', data: null },
        { status: 400 }
      );
    }

    // 将该用户的所有旧报告标记为非最新
    await execSql(`
      UPDATE career_planning_reports SET is_latest = 0 WHERE user_id = '${userId}'
    `);

    // 创建新报告（预留report_data字段，后续填充）
    const result = await execSql(`
      INSERT INTO career_planning_reports (
        user_id, major, grade, city, report_data, is_latest
      ) VALUES (
        '${userId}',
        ${major ? `'${major.replace(/'/g, "''")}'` : 'NULL'},
        '${grade.replace(/'/g, "''")}',
        ${city ? `'${city.replace(/'/g, "''")}'` : 'NULL'},
        NULL,
        1
      )
      RETURNING id
    `);

    const reportId = (result as Array<{id: number}>)?.[0]?.id;

    if (!reportId) {
      return NextResponse.json(
        { code: 500, message: '生成失败，请稍后重试', data: null },
        { status: 500 }
      );
    }

    return NextResponse.json({
      code: 200,
      message: '职业规划报告生成成功',
      data: {
        report_id: reportId
      }
    });

  } catch (error) {
    console.error('生成职业规划报告失败:', error);
    return NextResponse.json(
      { code: 500, message: '生成失败，请稍后重试', data: null },
      { status: 500 }
    );
  }
}
