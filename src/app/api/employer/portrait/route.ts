/**
 * 岗位真实画像 · API
 * GET  /api/employer/portrait — 列表
 * POST /api/employer/portrait — 创建
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

export async function GET(request: NextRequest) {
  const session = await getEmployerSession(request);
  if (!session) return jsonError('UNAUTHORIZED', '请先登录雇主账号');
  if (!session.companyId) return jsonError('FORBIDDEN', '请先完成企业认证');

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  let query = supabase
    .from('employer_portraits')
    .select('*')
    .eq('company_id', session.companyId)
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) {
    console.error('[portrait] list error:', error.message);
    return jsonError('UPSTREAM_ERROR', '查询失败');
  }

  return jsonOk(z.object({ items: z.any() }), { items: data });
}

export async function POST(request: NextRequest) {
  const session = await getEmployerSession(request);
  if (!session) return jsonError('UNAUTHORIZED', '请先登录雇主账号');
  if (!session.companyId) return jsonError('FORBIDDEN', '请先完成企业认证');

  const body = await request.json();
  const { title } = body;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return jsonError('INVALID_REQUEST', '岗位名称不能为空');
  }

  const { data, error } = await supabase
    .from('employer_portraits')
    .insert({
      company_id: session.companyId,
      created_by: session.employerId,
      title: title.trim(),
    })
    .select()
    .single();

  if (error) {
    console.error('[portrait] create error:', error.message);
    return jsonError('UPSTREAM_ERROR', '创建失败');
  }

  return jsonOk(z.object({ item: z.any() }), { item: data });
}
