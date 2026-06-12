import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';
import { getEmployerSession } from '@/lib/employer-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * S6 P3 · B 端候选人画像 API
 *
 * GET /api/employer/candidates
 *
 * 查询参数（全部可选）：
 *   grade               年级（大一/大二/大三/大四/研一/研二/研三）
 *   major               专业（模糊匹配）
 *   graduation_year     毕业年份（如 2027）
 *   target_industry     目标行业（模糊匹配）
 *   target_job          目标岗位（模糊匹配，匹配画像/规划/面试三处目标岗位）
 *   city                目标城市（jsonb 数组包含）
 *   min_completeness    最低画像完整度（0-100，默认 0）
 *   min_assessment      最低测评分（默认 0）
 *   has_internship      是否有实习（true/false）
 *   sort                排序：completeness（默认）/assessment/recent
 *   page                页码（默认 1）
 *   page_size           每页数量（默认 20，最大 100）
 *
 * 鉴权（S6 P4 切换）：getEmployerSession 校验 employer_profiles.status='active'
 * 返回字段：候选人画像（昵称已脱敏，phone 不返回）
 */

// 昵称脱敏：保留首字 + ** 末字
function maskNickname(nickname: string | null): string {
  if (!nickname) return '匿名候选人';
  const trimmed = nickname.trim();
  if (trimmed.length <= 1) return `${trimmed}**`;
  if (trimmed.length === 2) return `${trimmed[0]}*`;
  return `${trimmed[0]}**${trimmed[trimmed.length - 1]}`;
}

export async function GET(request: NextRequest) {
  const session = await getEmployerSession(request);
  if (!session) {
    // 安全：返回 404 而非 403，避免暴露端点
    return NextResponse.json({ error: '接口不存在' }, { status: 404 });
  }
  const employerId = session.employerId;

  const { searchParams } = new URL(request.url);

  // 解析筛选参数
  const grade = searchParams.get('grade');
  const major = searchParams.get('major');
  const graduationYear = searchParams.get('graduation_year');
  const targetIndustry = searchParams.get('target_industry');
  const targetJob = searchParams.get('target_job');
  const city = searchParams.get('city');
  const minCompleteness = parseInt(searchParams.get('min_completeness') || '0');
  const minAssessment = parseInt(searchParams.get('min_assessment') || '0');
  const hasInternship = searchParams.get('has_internship');
  const sort = searchParams.get('sort') || 'completeness';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('page_size') || '20')));

  // 动态构建 WHERE 子句（execSql 用 %L 占位符，按顺序替换）
  const where: string[] = ['1=1'];
  const params: unknown[] = [];

  if (grade) {
    where.push(`grade = %L`);
    params.push(grade);
  }
  if (major) {
    where.push(`major ILIKE %L`);
    params.push(`%${major}%`);
  }
  if (graduationYear) {
    where.push(`graduation_year = %L`);
    params.push(graduationYear);
  }
  if (targetIndustry) {
    where.push(`(target_industry ILIKE %L OR plan_target_industry ILIKE %L)`);
    params.push(`%${targetIndustry}%`, `%${targetIndustry}%`);
  }
  if (targetJob) {
    where.push(`(target_job ILIKE %L OR plan_target_job ILIKE %L OR interview_target_job ILIKE %L)`);
    params.push(`%${targetJob}%`, `%${targetJob}%`, `%${targetJob}%`);
  }
  if (city) {
    where.push(`target_cities @> %L::jsonb`);
    params.push(JSON.stringify([city]));
  }
  if (minCompleteness > 0) {
    where.push(`portrait_completeness_score >= %L`);
    params.push(minCompleteness);
  }
  if (minAssessment > 0) {
    where.push(`assessment_overall_score >= %L`);
    params.push(minAssessment);
  }
  if (hasInternship === 'true') {
    where.push(`has_internship = true`);
  } else if (hasInternship === 'false') {
    where.push(`has_internship = false`);
  }

  // 排序
  const orderBy =
    sort === 'assessment'
      ? 'assessment_overall_score DESC NULLS LAST, portrait_completeness_score DESC'
      : sort === 'recent'
      ? 'profile_updated_at DESC NULLS LAST'
      : 'portrait_completeness_score DESC, assessment_overall_score DESC NULLS LAST';

  const whereSql = where.join(' AND ');

  // 查总数
  const countSql = `SELECT COUNT(*)::int AS total FROM public.user_portrait_v WHERE ${whereSql}`;
  const countRows = (await execSql(countSql, ...params)) as Array<{ total: number }>;
  const total = countRows?.[0]?.total || 0;

  // 查列表（脱敏后输出）
  const offset = (page - 1) * pageSize;
  const listSql = `
    SELECT
      user_id,
      nickname,
      major,
      grade,
      graduation_year,
      gpa,
      english_level,
      target_cities,
      target_industry,
      target_job,
      career_tendency,
      personality_type,
      hard_skills,
      soft_skills,
      has_internship,
      has_project,
      awards,
      project_experience,
      internship_experience,
      membership_tier,
      portrait_completeness_score,
      assessment_overall_score,
      major_match_score,
      tech_skill_score,
      job_readiness_score,
      top_strengths,
      top_weaknesses,
      matched_jobs,
      skill_gaps,
      plan_target_job,
      plan_target_industry,
      current_match_score,
      interview_target_job,
      interview_overall_score,
      hr_round_score,
      technical_round_score,
      executive_round_score,
      profile_created_at,
      profile_updated_at,
      assessment_at,
      career_plan_at
    FROM public.user_portrait_v
    WHERE ${whereSql}
    ORDER BY ${orderBy}
    LIMIT %L OFFSET %L
  `;

  const rows = (await execSql(listSql, ...params, pageSize, offset)) as Array<Record<string, unknown>>;

  // 脱敏：替换 nickname；user_id 保留（admin 调用方需要）
  // S6 P4 employer 账号上线后将 user_id 替换为 candidate_token（一次性匿名 ID）
  const items = (rows || []).map((row) => ({
    ...row,
    nickname: maskNickname(row.nickname as string | null),
  }));

  return NextResponse.json({
    success: true,
    data: {
      items,
      total,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(total / pageSize),
      filters: {
        grade,
        major,
        graduation_year: graduationYear,
        target_industry: targetIndustry,
        target_job: targetJob,
        city,
        min_completeness: minCompleteness,
        min_assessment: minAssessment,
        has_internship: hasInternship,
        sort,
      },
    },
  });
}
