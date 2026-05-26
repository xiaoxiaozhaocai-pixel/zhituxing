export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { execSql } from '@/lib/exec-sql';

export const runtime = 'edge';

// 管理员权限校验
async function checkAdmin(request: NextRequest): Promise<number | null> {
  const authUserId = await getAuthenticatedUserId(request);
    const userId = authUserId ? parseInt(authUserId) : 0;
  if (!userId) return null;
  // 使用参数化查询防止SQL注入
  const rows = await execSql(
    `SELECT is_admin FROM user_profiles WHERE user_id = %L`,
    userId
  ) as Record<string, unknown>[];
  if (!rows?.length || !rows[0].is_admin) return null;
  return userId;
}

// GET /api/admin/users — 用户列表 + 统计 + 详情
export async function GET(request: NextRequest) {
  const adminId = await checkAdmin(request);
  if (!adminId) {
    // 安全修复：返回 404 而非 403，避免暴露端点存在
    return NextResponse.json({ error: '接口不存在' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  // action=detail — 单用户详情
  if (action === 'detail') {
    const targetUserId = parseInt(searchParams.get('user_id') || '0');
    if (!targetUserId) {
      return NextResponse.json({ error: '缺少 user_id' }, { status: 400 });
    }
    return getUserDetail(targetUserId);
  }

  // action=stats — 统计数据
  if (action === 'stats') {
    return getStats();
  }

  // action=growth — 增长趋势
  if (action === 'growth') {
    return getGrowthTrend(searchParams.get('days') || '30');
  }

  // 默认 — 用户列表
  return getUserList(searchParams);
}

async function getStats() {
  // 总用户数（无参数，使用直接查询）
  const totalRows = await execSql(
    `SELECT COUNT(*)::int as total FROM user_profiles`
  ) as Record<string, unknown>[];

  // 会员数（无参数，使用直接查询）
  const memberRows = await execSql(
    `SELECT COUNT(*)::int as total FROM user_profiles WHERE membership_type = 'member'`
  ) as Record<string, unknown>[];

  // 本周新增（无参数，使用直接查询）
  const weekRows = await execSql(
    `SELECT COUNT(*)::int as total FROM user_profiles WHERE created_at >= NOW() - INTERVAL '7 days'`
  ) as Record<string, unknown>[];

  const total = (totalRows?.[0]?.total as number) || 0;
  const members = (memberRows?.[0]?.total as number) || 0;
  const weeklyNew = (weekRows?.[0]?.total as number) || 0;
  const conversionRate = total > 0 ? Math.round((members / total) * 100) : 0;

  return NextResponse.json({
    success: true,
    data: { total, members, conversionRate, weeklyNew },
  });
}

async function getGrowthTrend(days: string) {
  const d = Math.min(parseInt(days) || 30, 90);
  // 使用参数化查询防止SQL注入
  const rows = await execSql(
    `SELECT DATE(created_at) as date, COUNT(*)::int as count
     FROM user_profiles
     WHERE created_at >= NOW() - (%L::text || ' days')::interval
     GROUP BY DATE(created_at)
     ORDER BY DATE(created_at) ASC`,
    d
  ) as Record<string, unknown>[];

  return NextResponse.json({
    success: true,
    data: rows || [],
    days: d,
  });
}

async function getUserDetail(userId: number) {
  // 使用参数化查询防止SQL注入
  const profileRows = await execSql(
    `SELECT user_id, user_type, membership_type, membership_plan, major, grade,
            job_intention, city, skills, personality_type, ability_background::text,
            internship_experience, project_experience, awards, is_admin, created_at
     FROM user_profiles WHERE user_id = %L`,
    userId
  ) as Record<string, unknown>[];

  if (!profileRows?.length) {
    return NextResponse.json({ error: '用户不存在' }, { status: 404 });
  }

  // 使用参数化查询
  const skillRows = await execSql(
    `SELECT skill_name, level, proficiency FROM user_skills WHERE user_id = %L ORDER BY level DESC`,
    userId
  ) as Record<string, unknown>[];

  // 使用参数化查询
  const assessmentRows = await execSql(
    `SELECT id, result_data::text, created_at FROM assessment_results WHERE user_id = %L ORDER BY created_at DESC LIMIT 5`,
    userId
  ) as Record<string, unknown>[];

  // 使用参数化查询
  const matchRows = await execSql(
    `SELECT id, match_data::text, created_at FROM skill_job_match WHERE user_id = %L ORDER BY created_at DESC LIMIT 5`,
    userId
  ) as Record<string, unknown>[];

  // 使用参数化查询
  const interviewRows = await execSql(
    `SELECT id, result_data::text, created_at FROM interview_results WHERE user_id = %L ORDER BY created_at DESC LIMIT 5`,
    userId
  ) as Record<string, unknown>[];

  // 使用参数化查询
  const careerRows = await execSql(
    `SELECT id, plan_data::text, created_at FROM career_plans WHERE user_id = %L ORDER BY created_at DESC LIMIT 5`,
    userId
  ) as Record<string, unknown>[];

  // 使用参数化查询
  const behaviorRows = await execSql(
    `SELECT event_type, COUNT(*)::int as count FROM analytics_events WHERE user_id = %L GROUP BY event_type ORDER BY count DESC`,
    userId
  ) as Record<string, unknown>[];

  const profile = profileRows[0];
  // 解析 ability_background JSON
  let abilityBackground = null;
  try {
    abilityBackground = profile.ability_background ? JSON.parse(profile.ability_background as string) : null;
  } catch { /* ignore */ }

  return NextResponse.json({
    success: true,
    data: {
      profile: {
        ...profile,
        ability_background: abilityBackground,
      },
      skills: skillRows || [],
      assessments: assessmentRows || [],
      matches: matchRows || [],
      interviews: interviewRows || [],
      careerPlans: careerRows || [],
      behaviorStats: behaviorRows || [],
    },
  });
}

async function getUserList(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('page_size') || '20')));
  const keyword = searchParams.get('keyword') || '';
  const membershipType = searchParams.get('membership_type') || '';
  const major = searchParams.get('major') || '';
  const grade = searchParams.get('grade') || '';

  const offset = (page - 1) * pageSize;

  // 构建参数数组和WHERE条件
  const params: any[] = [];
  const conditions: string[] = [];
  
  if (keyword) {
    // 转义LIKE通配符
    const escapedKeyword = keyword.replace(/[%_]/g, '\\$&');
    conditions.push(`(CAST(user_id AS TEXT) ILIKE '%' || %L || '%' OR major ILIKE '%' || %L || '%' OR job_intention ILIKE '%' || %L || '%')`);
    params.push(escapedKeyword, escapedKeyword, escapedKeyword);
  }
  if (membershipType) {
    conditions.push(`membership_type = %L`);
    params.push(membershipType);
  }
  if (major) {
    conditions.push(`major ILIKE '%' || %L || '%'`);
    params.push(major);
  }
  if (grade) {
    conditions.push(`grade = %L`);
    params.push(grade);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // 查总数
  const countRows = await execSql(
    `SELECT COUNT(*)::int as total FROM user_profiles ${whereClause}`,
    ...params
  ) as Record<string, unknown>[];
  const total = (countRows?.[0]?.total as number) || 0;

  // 查列表 - 限制分页参数防止注入
  const safePageSize = Math.min(100, Math.max(1, pageSize));
  const safeOffset = Math.max(0, offset);
  
  const rows = await execSql(
    `SELECT user_id, user_type, membership_type, membership_plan, major, grade,
            job_intention, city, personality_type, is_admin, created_at
     FROM user_profiles ${whereClause}
     ORDER BY created_at DESC
     LIMIT ${safePageSize} OFFSET ${safeOffset}`,
    ...params
  ) as Record<string, unknown>[];

  // 查每个用户的技能数量（无参数，使用直接查询）
  const skillCountRows = await execSql(
    `SELECT user_id, COUNT(*)::int as skill_count FROM user_skills GROUP BY user_id`
  ) as Record<string, unknown>[];
  const skillCountMap: Record<number, number> = {};
  for (const row of skillCountRows || []) {
    skillCountMap[row.user_id as number] = row.skill_count as number;
  }

  // 查每个用户的测评次数（无参数，使用直接查询）
  const assessCountRows = await execSql(
    `SELECT user_id, COUNT(*)::int as count FROM assessment_results GROUP BY user_id`
  ) as Record<string, unknown>[];
  const assessCountMap: Record<number, number> = {};
  for (const row of assessCountRows || []) {
    assessCountMap[row.user_id as number] = row.count as number;
  }

  const data = (rows || []).map(row => ({
    ...row,
    skill_count: skillCountMap[row.user_id as number] || 0,
    assessment_count: assessCountMap[row.user_id as number] || 0,
  }));

  return NextResponse.json({
    success: true,
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
