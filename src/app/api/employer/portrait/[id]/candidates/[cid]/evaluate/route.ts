/**
 * 岗位真实画像 · 提交盲评
 * POST — 提交Skill/Exp/Soft三级评估
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

interface RouteContext { params: Promise<{ id: string; cid: string }> }

export async function POST(request: NextRequest, ctx: RouteContext) {
  const session = await getEmployerSession(request);
  if (!session) return jsonError('UNAUTHORIZED', '请先登录雇主账号');

  const { id, cid } = await ctx.params;
  const body = await request.json();
  const { skill_level, exp_level, soft_level, notes } = body;

  if (![skill_level, exp_level, soft_level].every(v => Number.isInteger(v) && v >= 1 && v <= 5)) {
    return jsonError('INVALID_REQUEST', 'Skill/Exp/Soft 等级须为1-5的整数');
  }

  // upsert：每人唯一
  const { data, error } = await supabase
    .from('portrait_evaluations')
    .upsert({
      candidate_id: cid,
      evaluated_by: session.employerId,
      skill_level,
      exp_level,
      soft_level,
      notes: notes || null,
    }, { onConflict: 'candidate_id' })
    .select()
    .single();

  if (error) {
    console.error('[portrait] evaluate error:', error.message);
    return jsonError('UPSTREAM_ERROR', '提交评估失败');
  }

  // 更新候选人状态为 evaluated
  await supabase
    .from('portrait_candidates')
    .update({ status: 'evaluated' })
    .eq('id', cid);

  // 更新画像项目已评计数
  const { count } = await supabase
    .from('portrait_candidates')
    .select('*', { count: 'exact', head: true })
    .eq('portrait_id', id)
    .eq('status', 'evaluated');

  await supabase
    .from('employer_portraits')
    .update({ evaluated_count: count || 0 })
    .eq('id', id);

  return jsonOk(z.object({ item: z.any(), evaluated_count: z.number() }), { item: data, evaluated_count: count || 0 });
}
