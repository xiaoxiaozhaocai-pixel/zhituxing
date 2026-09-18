/**
 * 岗位真实画像 · 进度与初步组态线索
 * GET — 已评/总数 + 各维度分布 + 初步洞察
 */
import { NextRequest } from 'next/server';
import { jsonOk, jsonError } from '@/lib/api-contracts/_shared';
import { z } from 'zod';
import { getEmployerSession } from '@/lib/employer-auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { runFsqca } from '@/lib/fsqca-engine';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface RouteContext { params: Promise<{ id: string }> }


/** 归属校验：portrait 必须属于当前雇主公司（防 IDOR，9/12 B端安全走查） */
async function assertPortraitOwned(
  portraitId: string,
  companyId: string | null
): Promise<boolean> {
  if (!companyId || !portraitId) return false;
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('employer_portraits')
    .select('id')
    .eq('id', portraitId)
    .eq('company_id', companyId)
    .maybeSingle();
  return !!data;
}

export async function GET(request: NextRequest, ctx: RouteContext) {
  const session = await getEmployerSession(request);
  if (!session) return jsonError('UNAUTHORIZED', '请先登录雇主账号');
  const supabase = getSupabaseAdmin();

  const { id } = await ctx.params;
  if (!(await assertPortraitOwned(id, session.companyId))) {
    return jsonError('NOT_FOUND', '画像项目不存在');
  }

  // 基本信息
  const { data: portrait } = await supabase
    .from('employer_portraits')
    .select('title, candidate_count, evaluated_count')
    .eq('id', id)
    .single();

  if (!portrait) return jsonError('NOT_FOUND', '画像项目不存在');

  // 各维度分布（仅本项目：portrait_evaluations 无 portrait_id 列，评估经 portrait_candidates
  // 归属项目——先取本项目候选人 id，再 in 过滤。9/12 修复：直查全表会跨项目/跨雇主串染）
  const { data: projCands } = await supabase
    .from('portrait_candidates')
    .select('id, edu_level')
    .eq('portrait_id', id);
  const projCandIds = (projCands || []).map((c: { id: string }) => c.id);
  // edu_level 按 candidate_id 建索引，供 fsQCA 第4条件使用
  const eduMap: Record<string, number | null> = {};
  (projCands || []).forEach((c: { id: string; edu_level: number | null }) => { eduMap[c.id] = c.edu_level ?? null; });
  const { data: evals, error: evalsErr } = projCandIds.length
    ? await supabase
        .from('portrait_evaluations')
        .select('candidate_id, skill_level, exp_level, soft_level, match_level')
        .in('candidate_id', projCandIds)
    : { data: [], error: null };
  if (evalsErr) return jsonError('UPSTREAM_ERROR', '分布查询失败');

  const dist = (arr: number[] | undefined): Record<string, number> => {
    if (!arr || arr.length === 0) return { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    const m: Record<string, number> = {};
    for (const v of arr) m[String(v)] = (m[String(v)] || 0) + 1;
    return m;
  };

 
  const skillDist = dist(evals?.map((e) => e.skill_level));
 
  const expDist = dist(evals?.map((e) => e.exp_level));
 
  const softDist = dist(evals?.map((e) => e.soft_level));

  const matchDist = dist(evals?.map((e) => e.match_level as number));

  // 初步组态线索（仅当 ≥5 人已评）
  const insights: string[] = [];
  const n = portrait.evaluated_count;

  if (n >= 5) {
 
    const skillHigh = evals!.filter((e) => e.skill_level >= 4).length;
 
    const expHigh = evals!.filter((e) => e.exp_level >= 4).length;
 
    const softHigh = evals!.filter((e) => e.soft_level >= 4).length;
 
    const allHigh = evals!.filter((e) => e.skill_level >= 4 && e.exp_level >= 4 && e.soft_level >= 4).length;

    if (skillHigh > n * 0.6) insights.push('技能高(Skill≥4)的候选人占多数，技能可能是基础门槛');
    if (expHigh < n * 0.3) insights.push('经验对口的候选人较少，Exp可能是筛选关键');
    if (softHigh > n * 0.5) insights.push('软素质偏强的候选人超过一半，Soft可能是加分项');
    if (allHigh > 0) insights.push(`有 ${allHigh} 人是三维度全面偏强型`);
  }

  // —— fsQCA 引擎：四条件(Skill/Exp/Soft/Edu) + 结果(Match) ——
  const rows = (evals || []).map((e) => ({
    skill: e.skill_level,
    exp: e.exp_level,
    soft: e.soft_level,
    edu: eduMap[e.candidate_id] ?? null,
    match: (e.match_level as number | null) ?? null,
  }));
  const fsqca = runFsqca(rows, 30);

  return jsonOk(z.object({
    title: z.string(), total: z.number(), evaluated: z.number(), remaining: z.number(),
    distribution: z.any(), insights: z.array(z.string()), fsqca: z.any(),
  }), {
    title: portrait.title,
    total: portrait.candidate_count,
    evaluated: portrait.evaluated_count,
    remaining: portrait.candidate_count - portrait.evaluated_count,
    distribution: { skill: skillDist, exp: expDist, soft: softDist, match: matchDist },
    insights,
    fsqca: {
      n: fsqca.n,
      sufficient: fsqca.sufficient,
      missingOutcome: fsqca.missingOutcome,
      hint: fsqca.hint,
      necessity: fsqca.necessity,
      solutions: fsqca.solutions,
    },
  });
}
