import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

// 提交JD
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
    const {
      job_name,
      industry,
      city,
      company_name,
      company_type,
      salary_min,
      salary_max,
      skills,
      jd_content
    } = body;

    // 验证必填字段
    if (!job_name || !company_name || !jd_content) {
      return NextResponse.json(
        { code: 400, message: '岗位名称、企业名称和JD内容为必填项', data: null },
        { status: 400 }
      );
    }

    // 插入数据库
    const result = await execSql(`
      INSERT INTO jd_submissions (
        user_id, job_name, industry, city, company_name, company_type,
        salary_min, salary_max, skills, jd_content, status
      ) VALUES (
        '${userId}',
        '${job_name.replace(/'/g, "''")}',
        ${industry ? `'${industry.replace(/'/g, "''")}'` : 'NULL'},
        ${city ? `'${city.replace(/'/g, "''")}'` : 'NULL'},
        '${company_name.replace(/'/g, "''")}',
        ${company_type ? `'${company_type.replace(/'/g, "''")}'` : 'NULL'},
        ${salary_min || 'NULL'},
        ${salary_max || 'NULL'},
        ${skills ? `'${skills.replace(/'/g, "''")}'` : 'NULL'},
        '${jd_content.replace(/'/g, "''")}',
        0
      )
      RETURNING id
    `);

    return NextResponse.json({
      code: 200,
      message: '提交成功，我们将在1个工作日内完成审核，审核通过后奖励将自动发放',
      data: {
        id: (result as Array<{id: number}>)?.[0]?.id
      }
    });

  } catch (error) {
    console.error('提交JD失败:', error);
    return NextResponse.json(
      { code: 500, message: '提交失败，请稍后重试', data: null },
      { status: 500 }
    );
  }
}

// 获取我的提交记录
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
    const status = searchParams.get('status');
    const offset = (page - 1) * pageSize;

    // 构建查询
    let whereClause = `WHERE user_id = '${userId}'`;
    if (status !== null && status !== '') {
      whereClause += ` AND status = '${status}'`;
    }

    // 获取总数
    const countResult = await execSql(`
      SELECT COUNT(*) as total FROM jd_submissions ${whereClause}
    `);
    const total = (countResult as Array<{total: number}>)?.[0]?.total || 0;

    // 获取列表
    const listResult = await execSql(`
      SELECT 
        id, job_name, industry, city, company_name, company_type,
        salary_min, salary_max, skills, status, reject_reason, create_time, update_time
      FROM jd_submissions
      ${whereClause}
      ORDER BY create_time DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `);

    // 状态映射
    const statusMap: Record<number, string> = {
      0: '待审核',
      1: '已通过',
      2: '已驳回'
    };

    const list = (listResult as Array<Record<string, unknown>> || []).map((item) => ({
      id: item.id,
      job_name: item.job_name,
      industry: item.industry,
      city: item.city,
      company_name: item.company_name,
      company_type: item.company_type,
      salary_min: item.salary_min,
      salary_max: item.salary_max,
      skills: item.skills,
      status: item.status,
      status_text: statusMap[item.status as number] || '未知',
      reject_reason: item.reject_reason,
      create_time: item.create_time,
      update_time: item.update_time
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
    console.error('获取提交记录失败:', error);
    return NextResponse.json(
      { code: 500, message: '获取失败', data: null },
      { status: 500 }
    );
  }
}
