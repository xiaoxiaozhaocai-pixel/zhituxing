import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';
export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

// 管理员鉴权验证
async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const adminToken = request.headers.get('x-admin-token') || request.headers.get('Authorization')?.replace('Bearer ', '');
  const validToken = process.env.ADMIN_SECRET_KEY;
  if (!validToken) {
    console.error('ADMIN_SECRET_KEY is not configured');
    return false;
  }
  return adminToken === validToken;
}

// GET: 查询JD列表（分页+搜索+筛选）+ 统计
export async function GET(request: NextRequest) {
  // 鉴权检查
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: '未授权访问' }, { status: 401 });
  }
  
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('page_size') || 10)));
    const keyword = searchParams.get('keyword')?.trim() || '';
    const industry = searchParams.get('industry')?.trim() || '';
    const city = searchParams.get('city')?.trim() || '';
    const status = searchParams.get('status')?.trim() || '';
    const offset = (page - 1) * pageSize;

    // 构建 WHERE 条件
    const conditions: string[] = [];
    if (keyword) conditions.push(`(job_name ILIKE '%${keyword}%' OR skills ILIKE '%${keyword}%' OR company_name ILIKE '%${keyword}%')`);
    if (industry) conditions.push(`industry = '${industry}'`);
    if (city) conditions.push(`city = '${city}'`);
    if (status) conditions.push(`status = '${status}'`);
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 查询数据
    const dataResult = await execSql(
      `SELECT id, job_name, industry, city, company_name, salary_min, salary_max, skills, source, status, created_at FROM jobs ${whereClause} ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`
    ) as Array<Record<string, unknown>>;

    const countResult = await execSql(
      `SELECT COUNT(*)::int as total FROM jobs ${whereClause}`
    ) as Array<Record<string, unknown>>;

    // 统计数据
    const statsResult = await execSql(`
      SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status = 'active')::int as active_count,
        COUNT(*) FILTER (WHERE status = 'disabled')::int as disabled_count,
        COUNT(*) FILTER (WHERE status = 'expired')::int as expired_count,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int as this_week_new
      FROM jobs
    `) as Array<Record<string, unknown>>;

    // 热门技能 Top 10
    const topSkillsResult = await execSql(`
      SELECT skill, COUNT(*)::int as cnt FROM (
        SELECT UNNEST(STRING_TO_ARRAY(skills, ',')) as skill FROM jobs WHERE skills IS NOT NULL AND skills != ''
      ) sub
      WHERE skill IS NOT NULL AND TRIM(skill) != ''
      GROUP BY TRIM(skill)
      ORDER BY cnt DESC
      LIMIT 10
    `) as Array<Record<string, unknown>>;

    // 行业分布
    const industryResult = await execSql(`
      SELECT industry, COUNT(*)::int as cnt FROM jobs
      WHERE industry IS NOT NULL AND industry != ''
      GROUP BY industry ORDER BY cnt DESC LIMIT 10
    `) as Array<Record<string, unknown>>;

    const total = (countResult?.[0]?.total as number) || 0;

    return NextResponse.json({
      success: true,
      data: dataResult || [],
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      stats: statsResult?.[0] || {},
      topSkills: topSkillsResult || [],
      industryDistribution: industryResult || [],
    });
  } catch (error) {
    console.error('[admin/jd] GET Error:', error);
    return NextResponse.json({ error: '查询失败' }, { status: 500 });
  }
}

// PUT: 更新JD状态（单条或批量）
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { ids, status } = body as { ids: number[]; status: string };

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: '请选择要操作的JD' }, { status: 400 });
    }
    if (!['active', 'disabled', 'expired'].includes(status)) {
      return NextResponse.json({ error: '无效的状态值' }, { status: 400 });
    }

    // 安全校验：ids 已经过 Number() 处理，均为数字
    const safeIds = ids.map(i => Number(i));
    const placeholders = safeIds.map(() => '%s').join(', ');
    await execSql(`UPDATE jobs SET status = %L WHERE id IN (${placeholders})`, status, ...safeIds);

    return NextResponse.json({ success: true, updated: ids.length });
  } catch (error) {
    console.error('[admin/jd] PUT Error:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

// DELETE: 删除JD（单条或批量）
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids')?.split(',').map(Number).filter(Boolean);

    if (!ids || ids.length === 0) {
      return NextResponse.json({ error: '请选择要删除的JD' }, { status: 400 });
    }

    // 安全校验：ids 已经过 Number() 处理，均为数字
    const safeIds = ids.map(i => Number(i));
    const placeholders = safeIds.map(() => '%s').join(', ');
    await execSql(`DELETE FROM jobs WHERE id IN (${placeholders})`, ...safeIds);

    return NextResponse.json({ success: true, deleted: ids.length });
  } catch (error) {
    console.error('[admin/jd] DELETE Error:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
