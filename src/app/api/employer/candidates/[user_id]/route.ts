/**
 * S6 P5-D · 雇主端候选人完整画像（需已解锁）
 * GET /api/employer/candidates/[user_id]
 *
 * 鉴权：
 *   1. 雇主 session 必须有效
 *   2. candidate_unlocks 表中存在 (employer_id, candidate_user_id) 且 expires_at > now()
 *   未解锁返回 403 LOCKED；已解锁返回 user_portrait_v 完整画像
 */
import { NextRequest } from 'next/server';
import { jsonOk, jsonError } from '@/lib/api-contracts/_shared';
import { EmployerCandidateDetailDataSchema } from '@/lib/api-contracts/employer';
import { getEmployerSession } from '@/lib/employer-auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ user_id: string }>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest, ctx: RouteContext) {
  const { user_id } = await ctx.params;

  if (!user_id || !UUID_RE.test(user_id)) {
    return jsonError('INVALID_REQUEST', '候选人 ID 无效');
  }

  const session = await getEmployerSession(request);
  if (!session) {
    return jsonError('UNAUTHORIZED', '请先登录雇主账号');
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // 1) 检查解锁记录（取最新一条 expires_at 最大的，仍在有效期内）
  const { data: unlockRows, error: unlockErr } = await supabase
    .from('candidate_unlocks')
    .select('unlocked_at,expires_at')
    .eq('employer_id', session.employerId)
    .eq('candidate_user_id', user_id)
    .order('expires_at', { ascending: false })
    .limit(1);

  if (unlockErr) {
    console.error('[employer/candidate-detail] unlock query failed', unlockErr);
    return jsonError('INTERNAL_ERROR', '解锁状态查询失败');
  }

  const latest = unlockRows?.[0];
  const now = Date.now();
  const isValid = latest && new Date(latest.expires_at).getTime() > now;

  if (!isValid) {
    return jsonError(
      'FORBIDDEN',
      latest ? '解锁已过期，请重新解锁' : '该候选人尚未解锁',
      {
        status: 403,
        details: latest
          ? { expired_at: latest.expires_at, hint: 'expired' }
          : { hint: 'not_unlocked' },
      },
    );
  }

  // 2) 查 user_portrait_v 视图
  const { data: portraitRow, error: portraitErr } = await supabase
    .from('user_portrait_v')
    .select(`
      user_id,nickname,phone,major,grade,graduation_year,gpa,english_level,
      target_cities,target_industry,target_job,career_tendency,personality_type,
      hard_skills,soft_skills,has_internship,has_project,
      awards,internship_experience,project_experience,
      assessment_at,assessment_overall_score,major_match_score,tech_skill_score,
      industry_awareness_score,practice_score,soft_skill_score,job_readiness_score,
      top_strengths,top_weaknesses,matched_jobs,skill_gaps,improvement_plan,
      career_plan_at,plan_target_job,plan_target_industry,career_paths,
      skill_learning_path,current_match_score,action_plan,
      interview_at,interview_target_job,interview_overall_score,
      resume_match_score,hr_round_score,technical_round_score,executive_round_score,
      key_strengths,key_weaknesses,gap_skills,
      portrait_completeness_score
    `)
    .eq('user_id', user_id)
    .maybeSingle();

  if (portraitErr) {
    console.error('[employer/candidate-detail] portrait query failed', portraitErr);
    return jsonError('INTERNAL_ERROR', '画像查询失败');
  }

  if (!portraitRow) {
    return jsonError('NOT_FOUND', '该候选人画像不存在');
  }

  const expiresMs = new Date(latest.expires_at).getTime();
  const hoursRemaining = Math.max(0, Math.round(((expiresMs - now) / 3_600_000) * 10) / 10);

  // 类型清洗：DB null→null，array 非数组→null
  const cleanArr = <T = unknown>(v: unknown): T[] | null =>
    Array.isArray(v) ? (v as T[]) : null;

  return jsonOk(EmployerCandidateDetailDataSchema, {
    unlock: {
      unlocked_at: latest.unlocked_at,
      expires_at: latest.expires_at,
      hours_remaining: hoursRemaining,
    },
    portrait: {
      user_id: portraitRow.user_id as string,
      nickname: (portraitRow.nickname as string | null) ?? null,
      phone: (portraitRow.phone as string | null) ?? null,
      major: (portraitRow.major as string | null) ?? null,
      grade: (portraitRow.grade as string | null) ?? null,
      graduation_year: portraitRow.graduation_year != null ? String(portraitRow.graduation_year) : null,
      gpa: typeof portraitRow.gpa === 'number' ? portraitRow.gpa : null,
      english_level: (portraitRow.english_level as string | null) ?? null,
      target_cities: cleanArr<string>(portraitRow.target_cities),
      target_industry: (portraitRow.target_industry as string | null) ?? null,
      target_job: (portraitRow.target_job as string | null) ?? null,
      career_tendency: (portraitRow.career_tendency as string | null) ?? null,
      personality_type: (portraitRow.personality_type as string | null) ?? null,
      hard_skills: cleanArr<string>(portraitRow.hard_skills),
      soft_skills: cleanArr<string>(portraitRow.soft_skills),
      has_internship: typeof portraitRow.has_internship === 'boolean' ? portraitRow.has_internship : null,
      has_project: typeof portraitRow.has_project === 'boolean' ? portraitRow.has_project : null,
      awards: cleanArr(portraitRow.awards),
      internship_experience: cleanArr(portraitRow.internship_experience),
      project_experience: cleanArr(portraitRow.project_experience),
      assessment_at: (portraitRow.assessment_at as string | null) ?? null,
      assessment_overall_score: typeof portraitRow.assessment_overall_score === 'number' ? portraitRow.assessment_overall_score : null,
      major_match_score: typeof portraitRow.major_match_score === 'number' ? portraitRow.major_match_score : null,
      tech_skill_score: typeof portraitRow.tech_skill_score === 'number' ? portraitRow.tech_skill_score : null,
      industry_awareness_score: typeof portraitRow.industry_awareness_score === 'number' ? portraitRow.industry_awareness_score : null,
      practice_score: typeof portraitRow.practice_score === 'number' ? portraitRow.practice_score : null,
      soft_skill_score: typeof portraitRow.soft_skill_score === 'number' ? portraitRow.soft_skill_score : null,
      job_readiness_score: typeof portraitRow.job_readiness_score === 'number' ? portraitRow.job_readiness_score : null,
      top_strengths: cleanArr<string>(portraitRow.top_strengths),
      top_weaknesses: cleanArr<string>(portraitRow.top_weaknesses),
      matched_jobs: cleanArr(portraitRow.matched_jobs),
      skill_gaps: cleanArr<string>(portraitRow.skill_gaps),
      improvement_plan: portraitRow.improvement_plan ?? null,
      career_plan_at: (portraitRow.career_plan_at as string | null) ?? null,
      plan_target_job: (portraitRow.plan_target_job as string | null) ?? null,
      plan_target_industry: (portraitRow.plan_target_industry as string | null) ?? null,
      career_paths: cleanArr(portraitRow.career_paths),
      skill_learning_path: portraitRow.skill_learning_path ?? null,
      current_match_score: typeof portraitRow.current_match_score === 'number' ? portraitRow.current_match_score : null,
      action_plan: portraitRow.action_plan ?? null,
      interview_at: (portraitRow.interview_at as string | null) ?? null,
      interview_target_job: (portraitRow.interview_target_job as string | null) ?? null,
      interview_overall_score: typeof portraitRow.interview_overall_score === 'number' ? portraitRow.interview_overall_score : null,
      resume_match_score: typeof portraitRow.resume_match_score === 'number' ? portraitRow.resume_match_score : null,
      hr_round_score: typeof portraitRow.hr_round_score === 'number' ? portraitRow.hr_round_score : null,
      technical_round_score: typeof portraitRow.technical_round_score === 'number' ? portraitRow.technical_round_score : null,
      executive_round_score: typeof portraitRow.executive_round_score === 'number' ? portraitRow.executive_round_score : null,
      key_strengths: cleanArr<string>(portraitRow.key_strengths),
      key_weaknesses: cleanArr<string>(portraitRow.key_weaknesses),
      gap_skills: cleanArr<string>(portraitRow.gap_skills),
      portrait_completeness_score: Number(portraitRow.portrait_completeness_score) || 0,
    },
  });
}
