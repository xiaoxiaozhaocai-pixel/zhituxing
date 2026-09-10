/**
 * C8 一岗一策 API
 *
 * POST /api/career/one-jd-strategy
 * Body: { jdText: string, resumeText?: string }
 *
 * 设计决策：
 * - 不设登录门槛：轻入口定位（懂桂电学生的AI朋友），基础判断力功能开放使用；
 *   引擎纯规则零LLM成本，滥用风险低，用输入长度上限兜底。
 * - 纯规则引擎：毫秒级响应、¥0 成本、结果确定可复现。
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { jsonOk, jsonError, zodErrorToResponse } from '@/lib/api-contracts/_shared';
import { buildOneJdStrategy } from '@/lib/career-paths/engine/one_jd_strategy';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  jdText: z.string().min(40, 'JD文本至少40字').max(8000, 'JD文本过长（上限8000字）'),
  resumeText: z.string().max(8000, '简历文本过长（上限8000字）').optional(),
});

const SubtextItemSchema = z.object({
  phrase: z.string(),
  surface: z.string(),
  meaning: z.string(),
  risk: z.enum(['low', 'medium', 'high']),
  advice: z.string(),
});

const RewritePointSchema = z.object({
  jdRequirement: z.string(),
  rewriteAdvice: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
});

const RewriteSectionSchema = z.object({
  matchScore: z.number(),
  matchedJob: z.string(),
  knownDictionary: z.boolean(),
  advantages: z.array(z.string()),
  rewritePoints: z.array(RewritePointSchema),
  gaps: z.array(z.object({ skill: z.string(), gap: z.string(), path: z.string() })),
});

const ResponseSchema = z.object({
  jdTitle: z.string(),
  decoded: z.object({
    summary: z.string(),
    subtextItems: z.array(SubtextItemSchema),
    hiddenRequirements: z.array(z.string()),
  }),
  rewrite: RewriteSectionSchema.nullable(),
  applyStrategy: z.object({
    verdict: z.string(),
    matchScore: z.number().optional(),
    matchAssessment: z.string(),
    differentiators: z.array(z.string()),
    timing: z.string(),
    riskWarnings: z.array(z.string()),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return jsonError('INVALID_REQUEST', '请求体不是合法 JSON');
    }

    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return zodErrorToResponse(parsed.error);
    }

    const report = buildOneJdStrategy(parsed.data);

    // 使用观测埋点（fire-and-forget）：记录真实使用形态，为引擎迭代提供数据。失败静默不阻塞响应。
    try {
      getSupabaseAdmin()
        .from('one_jd_usage')
        .insert({
          has_resume: Boolean(parsed.data.resumeText),
          job_title: report.jdTitle || null,
          verdict: report.applyStrategy.verdict || null,
          match_score: report.applyStrategy.matchScore ?? null,
          jd_length: parsed.data.jdText.length,
        })
        .then(undefined, () => undefined);
    } catch {
      // 埋点失败不影响主流程
    }

    return jsonOk(ResponseSchema, report);
  } catch (err) {
    const message = err instanceof Error ? err.message : '生成一岗一策报告失败';
    // 引擎抛错（如JD过短）属于业务可预期错误
    return jsonError('BUSINESS_ERROR', message, { status: 400 });
  }
}
