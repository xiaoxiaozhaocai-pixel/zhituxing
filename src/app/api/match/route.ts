/**
 * 岗位匹配 API — P1 改造版
 * 
 * 变更摘要（v2.0 vs v1.0）：
 * - GET：从假分（baseScore = max(60, 95-index*2)）改为多维真实打分
 * - POST：修复分母Bug，改为调用 matching-service.ts 真实匹配引擎
 * - 所有匹配均走 matching-algorithm.ts 四个核心函数
 * 
 * 认证：同 /api/chat（cookie sb-access-token + Supabase Auth）
 */


import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { jsonOk, jsonError, parseRequestBody } from '@/lib/api-contracts/_shared';
import { matchJobs } from '@/lib/matching-service';
import {
  MatchPostRequestSchema,
  MatchPostDataSchema,
  MatchGetDataSchema,
} from '@/lib/api-contracts/match';
export const dynamic = 'force-dynamic';

// ============================================================
// GET /api/match — 语义搜索匹配（替代旧假分逻辑）
// ============================================================

export async function GET(request: NextRequest) {
  try {
    // 认证
    const accessToken = request.cookies.get('sb-access-token');
    if (!accessToken) {
      return jsonError('UNAUTHORIZED', '请先登录');
    }

    const supabase = getSupabaseAdmin();
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken.value);

    if (authError || !user) {
      return jsonError('TOKEN_EXPIRED', '登录已过期，请重新登录');
    }

    // 提取查询参数
    const url = new URL(request.url);
    const skills = url.searchParams.get('skills') || undefined;
    const industry = url.searchParams.get('industry') || undefined;
    const city = url.searchParams.get('city') || undefined;
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 20);

    // 执行真实匹配
    const results = await matchJobs({
      userId: user.id,
      skills,
      industry,
      city,
      limit,
    });

    // 解析用户输入技能为数组
    const userSkillsArray = skills
      ? skills.split(/[,，、\s]+/).map(s => s.trim()).filter(Boolean)
      : [];

    // 格式化为 MatchGetDataSchema
    const matches = results.map(r => ({
      job: {
        id: r.jobId,
        jobName: r.jobTitle,
        city: r.jobMeta.city || '',
        industry: r.jobMeta.industry || '',
        salaryMin: r.salaryEstimation?.estimatedMin ?? 0,
        salaryMax: r.salaryEstimation?.estimatedMax ?? 0,
        salaryRange: r.jobMeta.salaryRange || '',
        requiredSkills: r.matchedSkills.slice(0, 5),
      },
      matchScore: r.totalScore,
      weightedScore: r.totalScore,
      matchedSkills: r.matchedSkills,
      gapSkills: r.skillGaps,
      requiredGaps: r.requiredGaps,
      learningPath: [],
      salary: {
        estimatedMin: r.salaryEstimation?.estimatedMin ?? 0,
        estimatedMax: r.salaryEstimation?.estimatedMax ?? 0,
        estimatedMedian: r.salaryEstimation?.estimatedMedian ?? 0,
      },
    }));

    return jsonOk(MatchGetDataSchema, {
      matches,
      user_skills: userSkillsArray,
      total: matches.length,
    });
  } catch (error) {
    console.error('[match:GET] Error:', error);
    return jsonError('INTERNAL_ERROR', '匹配服务异常，请稍后重试');
  }
}

// ============================================================
// POST /api/match — 结构化匹配（修复分母Bug）
// ============================================================

export async function POST(request: NextRequest) {
  try {
    // 认证
    const accessToken = request.cookies.get('sb-access-token');
    if (!accessToken) {
      return jsonError('UNAUTHORIZED', '请先登录');
    }

    const supabase = getSupabaseAdmin();
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken.value);

    if (authError || !user) {
      return jsonError('TOKEN_EXPIRED', '登录已过期，请重新登录');
    }

    // 请求体校验
    const parsed = await parseRequestBody(request, MatchPostRequestSchema);
    if (!parsed.ok) return parsed.response;
    const { skills, targetPosition, industry } = parsed.data;

    // 执行真实匹配
    const results = await matchJobs({
      userId: user.id,
      skills: Array.isArray(skills) ? skills.join(',') : skills,
      targetPosition,
      industry,
      limit: 10,
    });

    // 格式化为 MatchPostDataSchema
    const userSkillsArray = Array.isArray(skills) ? skills : [];
    const matches = results.map(r => ({
      id: r.jobId,
      job_title: r.jobTitle,
      company: null,
      city: r.jobMeta.city || null,
      salary_range: r.jobMeta.salaryRange || '',
      education: r.jobMeta.education || null,
      experience: r.jobMeta.experience || null,
      industry: r.jobMeta.industry || null,
      match_score: r.totalScore,
      skill_match_score: r.dimensions.skillScore,
      matched_skills: r.matchedSkills,
      gap_skills: r.skillGaps,
      fresh_graduate_friendly: null,
    }));

    return jsonOk(MatchPostDataSchema, {
      matches,
      user_skills: userSkillsArray,
      total: matches.length,
    });
  } catch (error) {
    console.error('[match:POST] Error:', error);
    return jsonError('INTERNAL_ERROR', '匹配服务异常，请稍后重试');
  }
}
