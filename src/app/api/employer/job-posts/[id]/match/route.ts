import { NextRequest, NextResponse } from 'next/server';
import { getEmployerSession } from '@/lib/employer-auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { execSql } from '@/lib/exec-sql';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * P7.2 岗位匹配 API
 * GET  — 获取该岗位的匹配结果列表（按匹配分从高到低，分页）
 * POST — 手动触发重新匹配
 */

// 计算匹配分数
function calculateMatchScore(candidate: Record<string, unknown>, post: Record<string, unknown>): number {
  let score = 0;
  let totalWeight = 0;

  // 技能匹配（权重40%）
  const requiredHardSkills = (post.required_hard_skills as string[]) || [];
  if (requiredHardSkills.length > 0) {
    const candHardSkills = (candidate.hard_skills as string[]) || [];
    const candSoftSkills = (candidate.soft_skills as string[]) || [];
    const candSkills = [...candHardSkills, ...candSoftSkills];
    const matched = requiredHardSkills.filter((s: string) =>
      candSkills.some((cs: string) => cs.toLowerCase().includes(s.toLowerCase()))
    );
    score += (matched.length / requiredHardSkills.length) * 40;
  }
  totalWeight += 40;

  // 行业匹配（权重20%）
  const targetIndustry = post.target_industry as string;
  const candTargetIndustry = candidate.target_industry as string;
  if (targetIndustry && candTargetIndustry) {
    if (
      candTargetIndustry.toLowerCase().includes(targetIndustry.toLowerCase()) ||
      targetIndustry.toLowerCase().includes(candTargetIndustry.toLowerCase())
    ) {
      score += 20;
    }
  }
  totalWeight += 20;

  // 城市匹配（权重15%）
  const targetCities = (post.target_cities as string[]) || [];
  const candTargetCities = (candidate.target_cities as string[]) || [];
  if (targetCities.length > 0 && candTargetCities.length > 0) {
    const hasMatch = targetCities.some((c: string) =>
      candTargetCities.includes(c)
    );
    if (hasMatch) score += 15;
  }
  totalWeight += 15;

  // 画像完整度（权重15%）
  const completenessScore = candidate.portrait_completeness_score as number;
  if (completenessScore != null) {
    score += (completenessScore / 100) * 15;
  }
  totalWeight += 15;

  // 测评分（权重10%）
  const assessmentScore = candidate.assessment_overall_score as number;
  if (assessmentScore != null) {
    score += (assessmentScore / 100) * 10;
  }
  totalWeight += 10;

  // 归一化
  return Math.round((score / Math.max(totalWeight, 1)) * 100);
}

// GET /api/employer/job-posts/:id/match?page=1&page_size=20
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getEmployerSession(request);
  if (!session) {
    return NextResponse.json({ error: '接口不存在' }, { status: 404 });
  }

  const { id } = await params;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('page_size') || '20')));

  const supabase = getSupabaseAdmin();

  // 先验证岗位属主
  const { data: post } = await supabase
    .from('employer_job_posts')
    .select('*')
    .eq('id', id)
    .eq('employer_id', session.employerId)
    .single();

  if (!post) {
    return NextResponse.json({ error: '岗位不存在' }, { status: 404 });
  }

  // 查缓存
  const offset = (page - 1) * pageSize;

  const { data: matches, count } = await supabase
    .from('employer_job_matches')
    .select('*', { count: 'exact' })
    .eq('job_post_id', id)
    .order('match_score', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (matches && matches.length > 0) {
    return NextResponse.json({
      success: true,
      data: {
        items: matches,
        total: count || 0,
        page,
        page_size: pageSize,
        cached: true,
      },
    });
  }

  // 无缓存，触发匹配
  const result = await runMatch(post, session.employerId);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  // 返回新匹配结果
  const { data: newMatches, count: newCount } = await supabase
    .from('employer_job_matches')
    .select('*', { count: 'exact' })
    .eq('job_post_id', id)
    .order('match_score', { ascending: false })
    .range(offset, offset + pageSize - 1);

  return NextResponse.json({
    success: true,
    data: {
      items: newMatches || [],
      total: newCount || 0,
      page,
      page_size: pageSize,
      cached: false,
    },
  });
}

// POST /api/employer/job-posts/:id/match — 手动触发重新匹配
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getEmployerSession(request);
  if (!session) {
    return NextResponse.json({ error: '接口不存在' }, { status: 404 });
  }

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  // 验证岗位属主
  const { data: post } = await supabase
    .from('employer_job_posts')
    .select('*')
    .eq('id', id)
    .eq('employer_id', session.employerId)
    .single();

  if (!post) {
    return NextResponse.json({ error: '岗位不存在' }, { status: 404 });
  }

  const result = await runMatch(post, session.employerId);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: {
      matched_count: result.count,
      message: `匹配完成，共找到 ${result.count} 位候选人`,
    },
  });
}

async function runMatch(post: Record<string, unknown>, employerId: string): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const supabase = getSupabaseAdmin();
    const postId = post.id as number;

    // 构建查询条件
    const where: string[] = ['1=1'];
    const params: unknown[] = [];

    if (post.target_grade) {
      where.push('grade = %L');
      params.push(post.target_grade);
    }
    if (post.target_major) {
      where.push('major ILIKE %L');
      params.push(`%${post.target_major}%`);
    }
    if (post.target_school) {
      where.push('school ILIKE %L');
      params.push(`%${post.target_school}%`);
    }
    if (post.target_industry) {
      where.push('(target_industry ILIKE %L OR plan_target_industry ILIKE %L)');
      params.push(`%${post.target_industry}%`, `%${post.target_industry}%`);
    }
    const targetCities = post.target_cities as string[];
    if (targetCities && targetCities.length > 0) {
      where.push('target_cities ?| %L::text[]');
      params.push(targetCities);
    }
    if ((post.min_completeness as number) > 0) {
      where.push('portrait_completeness_score >= %L');
      params.push(post.min_completeness);
    }
    if ((post.min_assessment as number) > 0) {
      where.push('assessment_overall_score >= %L');
      params.push(post.min_assessment);
    }
    if (post.has_internship_required === 'yes') {
      where.push('has_internship = true');
    } else if (post.has_internship_required === 'no') {
      where.push('has_internship = false');
    }
    if (post.graduation_year) {
      where.push('graduation_year = %L');
      params.push(post.graduation_year);
    }

    const whereSql = where.join(' AND ');

    const listSql = `
      SELECT
        user_id, nickname, major, grade, graduation_year,
        target_cities, target_industry, target_job,
        hard_skills, soft_skills, has_internship, has_project,
        portrait_completeness_score, assessment_overall_score,
        plan_target_industry
      FROM public.user_portrait_v
      WHERE ${whereSql}
    `;

    const rows = (await execSql(listSql, ...params)) as Array<Record<string, unknown>>;

    if (!rows || rows.length === 0) {
      return { success: true, count: 0 };
    }

    // 计算匹配分
    const matches = rows.map((candidate) => ({
      job_post_id: postId,
      candidate_user_id: candidate.user_id as string,
      match_score: calculateMatchScore(candidate, post),
    }));

    // UPSERT 写入
    const insertValues = matches
      .map(
        (m) =>
          `(${m.job_post_id}, '${m.candidate_user_id}', ${m.match_score}, NOW())`
      )
      .join(',');

    // 使用 ON CONFLICT 做 UPSERT
    const upsertSql = `
      INSERT INTO employer_job_matches (job_post_id, candidate_user_id, match_score, matched_at)
      VALUES ${insertValues}
      ON CONFLICT (job_post_id, candidate_user_id)
      DO UPDATE SET match_score = EXCLUDED.match_score, matched_at = NOW()
    `;

    const upsertResult = await execSql(upsertSql);
    
    // Update the updated_at of the job post
    await supabase
      .from('employer_job_posts')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', postId);

    return { success: true, count: matches.length };
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[match] runMatch error:', err.message);
    return { success: false, error: err.message };
  }
}
