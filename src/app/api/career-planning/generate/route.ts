/**
 * 职业规划报告生成接口
 * 保存用户提交的信息和生成的报告
 */

import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

// 生成职业规划报告
export async function POST(request: NextRequest) {
  try {
    // 获取用户ID
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({
        code: 401,
        message: '请先登录'
      }, { status: 401 });
    }

    const body = await request.json();
    const { major, grade, city, content } = body;

    // 参数验证
    if (!grade) {
      return NextResponse.json({
        code: 400,
        message: '请选择年级'
      }, { status: 400 });
    }

    // 将已有报告标记为非最新
    await execSql(`
      UPDATE career_planning_reports 
      SET is_latest = 0 
      WHERE user_id = ${parseInt(userId)} AND is_latest = 1
    `);

    const insertResult = await execSql(`
      INSERT INTO career_planning_reports (
        user_id, major, grade, city, report_data, is_latest, create_time
      ) VALUES (
        ${parseInt(userId)},
        ${major ? `'${major.replace(/'/g, "''")}'` : 'NULL'},
        '${grade.replace(/'/g, "''")}',
        ${city ? `'${city.replace(/'/g, "''")}'` : 'NULL'},
        ${content ? `'${content.replace(/'/g, "''")}'` : 'NULL'},
        1,
        NOW()
      )
    `) as unknown as { insertId: number };
    
    const result = Array.isArray(insertResult) ? insertResult[0] : insertResult;

    return NextResponse.json({
      code: 200,
      message: '报告生成成功',
      data: {
        report_id: result.insertId
      }
    });
  } catch (error) {
    console.error('生成报告失败:', error);
    return NextResponse.json({
      code: 500,
      message: '生成失败',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}
