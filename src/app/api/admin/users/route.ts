import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

export const runtime = 'edge';

// 管理员权限校验
async function checkAdmin(request: NextRequest): Promise<number | null> {
  const userId = parseInt(request.headers.get('x-user-id') || '0');
  if (!userId) return null;
  const rows = await execSql(
    `SELECT is_admin FROM user_profiles WHERE user_id = '${userId}'`
  ) as Record<string, unknown>[];
  if (!rows?.length || !rows[0].is_admin) return null;
  return userId;
}

// GET /api/admin/users — 用户列表 + 统计 + 详情
export async function GET(request: NextRequest) {
  const adminId = await checkAdmin(request);
  if (!adminId) {
    return NextResponse.json({ error: '无管理员权限' }, { status: 403 });
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
  // 总用户数
  const totalRows = await execSql(
    `SELECT COUNT(*)::int as total FROM user_profiles`
  ) as Record<string, unknown>[];

  // 会员数
  const memberRows = await execSql(
    `SELECT COUNT(*)::int as total FROM user_profiles WHERE membership_type = 'member'`
  ) as Record<string, unknown>[];

  // 本周新增
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
  const rows = await execSql(
    `SELECT DATE(created_at) as date, COUNT(*)::int as count
     FROM user_profiles
     WHERE created_at >= NOW() - INTERVAL '${d} days'
     GROUP BY DATE(created_at)
     ORDER BY DATE(created_at) ASC`
  ) as Record<string, unknown>[];

  return NextResponse.json({
    success: true,
    data: rows || [],
    days: d,
  });
}

async function getUserDetail(userId: number) {
  // 用户画像
  const profileRows = await execSql(
    `SELECT user_id, user_type, membership_type, membership_plan, major, grade,
            job_intention, city, skills, personality_type, ability_background::text,
            internship_experience, project_experience, awards, is_admin, created_at
     FROM user_profiles WHERE user_id = '${userId}'`
  ) as Record<string, unknown>[];

  if (!profileRows?.length) {
    return NextResponse.json({ error: '用户不存在' }, { status: 404 });
  }

  // 用户技能
  const skillRows = await execSql(
    `SELECT skill_name, level, proficiency FROM user_skills WHERE user_id = '${userId}' ORDER BY level DESC`
  ) as Record<string, unknown>[];

  // 测评历史
  const assessmentRows = await execSql(
    `SELECT id, result_data::text, created_at FROM assessment_results WHERE user_id = '${userId}' ORDER BY created_at DESC LIMIT 5`
  ) as Record<string, unknown>[];

  // 匹配记录
  const matchRows = await execSql(
    `SELECT id, match_data::text, created_at FROM skill_job_match WHERE user_id = '${userId}' ORDER BY created_at DESC LIMIT 5`
  ) as Record<string, unknown>[];

  // 面试记录
  const interviewRows = await execSql(
    `SELECT id, result_data::text, created_at FROM interview_results WHERE user_id = '${userId}' ORDER BY created_at DESC LIMIT 5`
  ) as Record<string, unknown>[];

  // 职业规划
  const careerRows = await execSql(
    `SELECT id, plan_data::text, created_at FROM career_plans WHERE user_id = '${userId}' ORDER BY created_at DESC LIMIT 5`
  ) as Record<string, unknown>[];

  // 行为统计
  const behaviorRows = await execSql(
    `SELECT event_type, COUNT(*)::int as count FROM analytics_events WHERE user_id = '${userId}' GROUP BY event_type ORDER BY count DESC`
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

  // 构建WHERE条件
  const conditions: string[] = [];
  if (keyword) {
    conditions.push(`(CAST(user_id AS TEXT) ILIKE '%${keyword}%' OR major ILIKE '%${keyword}%' OR job_intention ILIKE '%${keyword}%')`);
  }
  if (membershipType) {
    conditions.push(`membership_type = '${membershipType}'`);
  }
  if (major) {
    conditions.push(`major ILIKE '%${major}%'`);
  }
  if (grade) {
    conditions.push(`grade = '${grade}'`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // 查总数
  const countRows = await execSql(
    `SELECT COUNT(*)::int as total FROM user_profiles ${whereClause}`
  ) as Record<string, unknown>[];
  const total = (countRows?.[0]?.total as number) || 0;

  // 查列表
  const rows = await execSql(
    `SELECT user_id, user_type, membership_type, membership_plan, major, grade,
            job_intention, city, personality_type, is_admin, created_at
     FROM user_profiles ${whereClause}
     ORDER BY created_at DESC
     LIMIT ${pageSize} OFFSET ${offset}`
  ) as Record<string, unknown>[];

  // 查每个用户的技能数量
  const skillCountRows = await execSql(
    `SELECT user_id, COUNT(*)::int as skill_count FROM user_skills GROUP BY user_id`
  ) as Record<string, unknown>[];
  const skillCountMap: Record<number, number> = {};
  for (const row of skillCountRows || []) {
    skillCountMap[row.user_id as number] = row.skill_count as number;
  }

  // 查每个用户的测评次数
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
