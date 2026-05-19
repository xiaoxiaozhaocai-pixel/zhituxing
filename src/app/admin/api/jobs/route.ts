import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

// 获取JD列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const keyword = searchParams.get('keyword');
    const source = searchParams.get('source');
    const city = searchParams.get('city');
    const offset = (page - 1) * pageSize;

    let whereClause = 'WHERE 1=1';
    if (keyword) {
      whereClause += ` AND (job_name LIKE '%${keyword.replace(/'/g, "''")}%' OR COALESCE(company_name, '') LIKE '%${keyword.replace(/'/g, "''")}%')`;
    }
    if (source) {
      whereClause += ` AND COALESCE(source, '') = '${source.replace(/'/g, "''")}'`;
    }
    if (city) {
      whereClause += ` AND city = '${city.replace(/'/g, "''")}'`;
    }

    // 获取总数
    const countResult = await execSql(`
      SELECT COUNT(*) as total FROM jobs ${whereClause}
    `) as Array<{ total: number }>;
    const total = countResult[0]?.total || 0;

    // 获取列表
    const jobs = await execSql(`
      SELECT id, job_name, COALESCE(company_name, '未知公司') as company_name, city, salary_min, salary_max, industry, 
             COALESCE(source, '未知') as source, is_fresh_friendly, created_at
      FROM jobs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `);

    // 获取所有来源
    const sources = await execSql(`SELECT DISTINCT COALESCE(source, '未知') as source FROM jobs WHERE source IS NOT NULL`);
    const cities = await execSql(`SELECT DISTINCT city FROM jobs WHERE city IS NOT NULL ORDER BY city`);

    return NextResponse.json({
      code: 200,
      data: {
        list: jobs,
        sources: (sources as any[]).map(s => s.source),
        cities: (cities as any[]).map(c => c.city),
        pagination: { page, pageSize, total }
      }
    });
  } catch (error) {
    console.error('获取JD列表失败:', error);
    return NextResponse.json(
      { code: 500, message: '获取列表失败' },
      { status: 500 }
    );
  }
}

// 创建JD
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      job_name, company_name, company_type, city, salary_min, salary_max,
      industry, skills, jd_content, is_fresh_friendly, adminId, adminUsername
    } = body;

    if (!job_name || !company_name || !city) {
      return NextResponse.json({ code: 400, message: '缺少必填字段' }, { status: 400 });
    }

    const result = await execSql(`
      INSERT INTO jobs (job_name, company_name, company_type, city, salary_min, salary_max,
                        industry, skills, jd_content, is_fresh_friendly, source, created_at, updated_at)
      VALUES (
        '${job_name.replace(/'/g, "''")}',
        '${company_name.replace(/'/g, "''")}',
        '${company_type || ''}',
        '${city.replace(/'/g, "''")}',
        ${salary_min || 0},
        ${salary_max || 0},
        '${industry || ''}',
        '${skills || ''}',
        '${(jd_content || '').replace(/'/g, "''")}',
        ${is_fresh_friendly ? 1 : 0},
        '后台手动添加',
        NOW(),
        NOW()
      )
      RETURNING id
    `);

    await execSql(`
      INSERT INTO admin_operation_logs (admin_id, admin_username, operation_type, operation_content)
      VALUES (${adminId || 0}, '${adminUsername || 'unknown'}', 'jd_create', '新增JD: ${job_name} - ${company_name}')
    `);

    return NextResponse.json({
      code: 200,
      message: '创建成功',
      data: { id: (result as any[])?.[0]?.id }
    });
  } catch (error) {
    console.error('创建JD失败:', error);
    return NextResponse.json(
      { code: 500, message: '创建失败' },
      { status: 500 }
    );
  }
}

// 更新JD
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, job_name, company_name, company_type, city, salary_min, salary_max,
            industry, skills, jd_content, is_fresh_friendly, adminId, adminUsername } = body;

    if (!id) {
      return NextResponse.json({ code: 400, message: '缺少ID' }, { status: 400 });
    }

    await execSql(`
      UPDATE jobs SET
        job_name = '${job_name?.replace(/'/g, "''") || ''}',
        company_name = '${company_name?.replace(/'/g, "''") || ''}',
        company_type = '${company_type || ''}',
        city = '${city?.replace(/'/g, "''") || ''}',
        salary_min = ${salary_min || 0},
        salary_max = ${salary_max || 0},
        industry = '${industry || ''}',
        skills = '${skills || ''}',
        jd_content = '${(jd_content || '').replace(/'/g, "''")}',
        is_fresh_friendly = ${is_fresh_friendly ? 1 : 0},
        updated_at = NOW()
      WHERE id = ${id}
    `);

    await execSql(`
      INSERT INTO admin_operation_logs (admin_id, admin_username, operation_type, operation_content)
      VALUES (${adminId || 0}, '${adminUsername || 'unknown'}', 'jd_update', '更新JD #${id}: ${job_name || ''}')
    `);

    return NextResponse.json({ code: 200, message: '更新成功' });
  } catch (error) {
    console.error('更新JD失败:', error);
    return NextResponse.json({ code: 500, message: '更新失败' }, { status: 500 });
  }
}

// 删除JD
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ code: 400, message: '缺少ID' }, { status: 400 });
    }

    await execSql('DELETE FROM jobs WHERE id = %s', id);

    await execSql(`
      INSERT INTO admin_operation_logs (admin_id, admin_username, operation_type, operation_content)
      VALUES (0, 'unknown', 'jd_delete', '删除JD #${id}')
    `);

    return NextResponse.json({ code: 200, message: '删除成功' });
  } catch (error) {
    console.error('删除JD失败:', error);
    return NextResponse.json({ code: 500, message: '删除失败' }, { status: 500 });
  }
}
