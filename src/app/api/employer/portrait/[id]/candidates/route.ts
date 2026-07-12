/**
 * 岗位真实画像 · 候选人管理
 * POST — 批量导入候选人
 * GET  — 候选人列表（含评估状态）
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

// 学历自动编码
function encodeEduLevel(edu: string | null): number | null {
  if (!edu) return null;
  const e = edu.trim().toLowerCase();
  if (/博士|phd/i.test(e)) return 5;
  if (/硕士|研究生|master/i.test(e)) return 4;
  if (/211|985|双一流/.test(e) && /本科/i.test(e)) return 4;
  if (/本科|学士|bachelor/i.test(e)) return 3;
  if (/大专|专科|college/i.test(e)) return 2;
  if (/高中|中专|初中/i.test(e)) return 1;
  return null;
}

export async function POST(request: NextRequest, ctx: RouteContext) {
  const session = await getEmployerSession(request);
  if (!session) return jsonError('UNAUTHORIZED', '请先登录雇主账号');

  const { id } = await ctx.params;
  const body = await request.json();
  const { candidates } = body;

  if (!Array.isArray(candidates) || candidates.length === 0) {
    return jsonError('INVALID_REQUEST', '请提供候选人列表');
  }

  if (candidates.length > 100) {
    return jsonError('INVALID_REQUEST', '单次导入不超过100人');
  }

  const rows = candidates.map((c: { name: string; education?: string; experience_summary?: string }) => ({
    portrait_id: id,
    name: c.name,
    education: c.education || null,
    edu_level: encodeEduLevel(c.education || null),
    experience_summary: c.experience_summary || null,
  }));

  const { data, error } = await supabase
    .from('portrait_candidates')
    .insert(rows)
    .select('id, name, education, edu_level, status');

  if (error) {
    console.error('[portrait] import error:', error.message);
    return jsonError('UPSTREAM_ERROR', '导入失败');
  }

  // 更新计数
  await supabase.rpc('update_portrait_candidate_count', { p_portrait_id: id });

  return jsonOk(z.object({ inserted: z.number(), items: z.any() }), { inserted: data.length, items: data });
}

export async function GET(request: NextRequest, ctx: RouteContext) {
  const session = await getEmployerSession(request);
  if (!session) return jsonError('UNAUTHORIZED', '请先登录雇主账号');

  const { id } = await ctx.params;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  let query = supabase
    .from('portrait_candidates')
    .select('id, name, education, edu_level, experience_summary, status, created_at')
    .eq('portrait_id', id);

  if (status) query = query.eq('status', status);
  query = query.order('created_at', { ascending: true });

  const { data, error } = await query;
  if (error) return jsonError('UPSTREAM_ERROR', '查询失败');

  const { data: evals } = await supabase
    .from('portrait_evaluations')
    .select('candidate_id, skill_level, exp_level, soft_level, notes')
    .in('candidate_id', (data || []).map((d: any) => d.id));

  const evalMap: Record<string, any> = {};
  for (const e of evals || []) evalMap[e.candidate_id] = e;

  const items = (data || []).map((d: any) => ({
    ...d,
    evaluation: evalMap[d.id] || null,
  }));

  return jsonOk(z.object({ items: z.any() }), { items });
}
