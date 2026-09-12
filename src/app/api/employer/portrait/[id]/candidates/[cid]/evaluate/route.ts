/**
 * 岗位真实画像 · 提交盲评
 * POST — 提交Skill/Exp/Soft三级评估
 */
import { NextRequest } from 'next/server';
import { jsonOk, jsonError } from '@/lib/api-contracts/_shared';
import { z } from 'zod';
import { getEmployerSession } from '@/lib/employer-auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface RouteContext { params: Promise<{ id: string; cid: string }> }


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

export async function POST(request: NextRequest, ctx: RouteContext) {
  const session = await getEmployerSession(request);
  if (!session) return jsonError('UNAUTHORIZED', '请先登录雇主账号');
  const supabase = getSupabaseAdmin();

  const { id, cid } = await ctx.params;
  if (!(await assertPortraitOwned(id, session.companyId))) {
    return jsonError('NOT_FOUND', '画像项目不存在');
  }
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
