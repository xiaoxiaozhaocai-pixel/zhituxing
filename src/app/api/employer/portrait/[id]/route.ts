/**
 * 岗位真实画像 · 单项目API
 * GET   — 详情
 * PATCH — 更新
 * DELETE — 删除
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

  const { data, error } = await supabase
    .from('employer_portraits')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return jsonError('NOT_FOUND', '画像项目不存在');
  return jsonOk(z.object({ item: z.any() }), { item: data });
}

export async function PATCH(request: NextRequest, ctx: RouteContext) {
  const session = await getEmployerSession(request);
  if (!session) return jsonError('UNAUTHORIZED', '请先登录雇主账号');

  const { id } = await ctx.params;
  const body = await request.json();

  const allowed = ['status', 'skill_anchor', 'exp_anchor', 'edu_anchor', 'soft_anchor'];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return jsonError('INVALID_REQUEST', '没有可更新的字段');
  }

  const { data, error } = await supabase
    .from('employer_portraits')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return jsonError('UPSTREAM_ERROR', '更新失败');
  return jsonOk(z.object({ item: z.any() }), { item: data });
}

export async function DELETE(request: NextRequest, ctx: RouteContext) {
  const session = await getEmployerSession(request);
  if (!session) return jsonError('UNAUTHORIZED', '请先登录雇主账号');

  const { id } = await ctx.params;

  const { error } = await supabase
    .from('employer_portraits')
    .delete()
    .eq('id', id);

  if (error) return jsonError('UPSTREAM_ERROR', '删除失败');
  return jsonOk(z.object({ deleted: z.boolean() }), { deleted: true });
}
