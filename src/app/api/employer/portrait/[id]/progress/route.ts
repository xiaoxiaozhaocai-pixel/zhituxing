/**
 * 岗位真实画像 · 进度与初步组态线索
 * GET — 已评/总数 + 各维度分布 + 初步洞察
 */
import { NextRequest } from 'next/server';
import { jsonOk, jsonError } from '@/lib/api-contracts/_shared';
import { z } from 'zod';
import { getEmployerSession } from '@/lib/employer-auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

interface RouteContext { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, ctx: RouteContext) {
  const session = await getEmployerSession(request);
  if (!session) return jsonError('UNAUTHORIZED', '请先登录雇主账号');

  const { id } = await ctx.params;

  // 基本信息
  const { data: portrait } = await supabase
    .from('employer_portraits')
    .select('title, candidate_count, evaluated_count')
    .eq('id', id)
    .single();

  if (!portrait) return jsonError('NOT_FOUND', '画像项目不存在');

  // 各维度分布
  const { data: evals } = await supabase
    .from('portrait_evaluations')
    .select('skill_level, exp_level, soft_level');

  const dist = (arr: number[] | undefined): Record<string, number> => {
    if (!arr || arr.length === 0) return { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    const m: Record<string, number> = {};
    for (const v of arr) m[String(v)] = (m[String(v)] || 0) + 1;
    return m;
  };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
  const skillDist = dist(evals?.map((e: any) => e.skill_level));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
  const expDist = dist(evals?.map((e: any) => e.exp_level));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
  const softDist = dist(evals?.map((e: any) => e.soft_level));

  // 初步组态线索（仅当 ≥5 人已评）
  const insights: string[] = [];
  const n = portrait.evaluated_count;

  if (n >= 5) {
// eslint-disable-next-line @typescript-eslint/no-explicit-any
    const skillHigh = evals!.filter((e: any) => e.skill_level >= 4).length;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
    const expHigh = evals!.filter((e: any) => e.exp_level >= 4).length;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
    const softHigh = evals!.filter((e: any) => e.soft_level >= 4).length;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allHigh = evals!.filter((e: any) => e.skill_level >= 4 && e.exp_level >= 4 && e.soft_level >= 4).length;

    if (skillHigh > n * 0.6) insights.push('技能高(Skill≥4)的候选人占多数，技能可能是基础门槛');
    if (expHigh < n * 0.3) insights.push('经验对口的候选人较少，Exp可能是筛选关键');
    if (softHigh > n * 0.5) insights.push('软素质偏强的候选人超过一半，Soft可能是加分项');
    if (allHigh > 0) insights.push(`有 ${allHigh} 人是三维度全面偏强型`);
  }

  return jsonOk(z.object({
    title: z.string(), total: z.number(), evaluated: z.number(), remaining: z.number(),
    distribution: z.any(), insights: z.array(z.string()),
  }), {
    title: portrait.title,
    total: portrait.candidate_count,
    evaluated: portrait.evaluated_count,
    remaining: portrait.candidate_count - portrait.evaluated_count,
    distribution: { skill: skillDist, exp: expDist, soft: softDist },
    insights,
  });
}
