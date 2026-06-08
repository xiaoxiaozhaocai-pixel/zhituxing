/**
 * 岗位匹配 API — P1 改造版
 * 
 * 变更摘要（v2.0 vs v1.0）：
 * - GET：从假分（baseScore = max(60, 95-index*2)）改为 pgvector 语义搜索 + 多维打分
 * - POST：修复分母Bug，改为调用 matching-service.ts 真实匹配引擎
 * - 所有匹配均走 matching-algorithm.ts 四个核心函数
 * 
 * 认证：同 /api/chat（cookie sb-access-token + Supabase Auth）
 */

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sanitizeJDList } from '@/lib/jd-sanitizer';
import { jsonOk, jsonError, parseRequestBody } from '@/lib/api-contracts/_shared';
import { generateXiaozhiNote } from '@/lib/xiaozhi-recommend';
import { matchJobs, type MatchRequest } from '@/lib/matching-service';
import { isEmbeddingAvailable } from '@/lib/embedding';
import {
  MatchPostRequestSchema,
  MatchPostDataSchema,
  MatchGetDataSchema,
  type MatchPostItem,
} from '@/lib/api-contracts/match';

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

    // 检查 embedding 可用性
    if (!isEmbeddingAvailable()) {
      console.warn('[match:GET] Embedding not available, returning empty');
      return jsonOk(MatchGetDataSchema, {
        items: [],
        total: 0,
        source: 'none',
        xiaozhiNote: '匹配引擎暂未就绪，请先跟职搭子聊天获取岗位推荐～',
      });
    }

    // 执行真实匹配
    const results = await matchJobs({
      userId: user.id,
      skills,
      industry,
      city,
      limit,
    });

    // 格式化为契约 schema
    const items = results.map(r => ({
      jobId: String(r.jobId),
      jobName: r.jobTitle,
      matchScore: r.totalScore,
      weightedScore: r.totalScore,
      skillScore: r.dimensions.skillScore,
      skillGaps: r.skillGaps,
      industry: r.jobMeta.industry,
      city: r.jobMeta.city,
      salaryRange: r.jobMeta.salaryRange,
      salaryEstimation: r.salaryEstimation ? {
        min: r.salaryEstimation.estimatedMin,
        max: r.salaryEstimation.estimatedMax,
        median: r.salaryEstimation.estimatedMedian,
      } : undefined,
    }));

    const source = results.length > 0 ? 'pgvector' : 'none';
    const xiaozhiNote = generateXiaozhiNote(items.length, source);

    return jsonOk(MatchGetDataSchema, {
      items,
      total: items.length,
      source,
      xiaozhiNote,
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

    // 执行真实匹配（修复旧版分母Bug：skillMatchScore + industryMatch → 多维加权）
    const results = await matchJobs({
      userId: user.id,
      skills: Array.isArray(skills) ? skills.join(',') : skills,
      targetPosition,
      industry,
      limit: 10,
    });

    // 格式化为契约 schema
    const items: MatchPostItem[] = results.map(r => ({
      job_id: String(r.jobId),
      job_title: r.jobTitle,
      industry: r.jobMeta.industry,
      city: r.jobMeta.city,
      salary_range: r.jobMeta.salaryRange,
      education: r.jobMeta.education,
      experience: r.jobMeta.experience,
      match_score: r.totalScore,
      skill_match_score: r.dimensions.skillScore,
      skill_gaps: r.skillGaps,
      xiaozhi_note: undefined,
    }));

    // 为 Top1 生成小职推荐语
    if (items.length > 0 && items[0]) {
      items[0].xiaozhi_note = generateXiaozhiNote(1, 'pgvector');
    }

    return jsonOk(MatchPostDataSchema, { items, total: items.length });
  } catch (error) {
    console.error('[match:POST] Error:', error);
    return jsonError('INTERNAL_ERROR', '匹配服务异常，请稍后重试');
  }
}
