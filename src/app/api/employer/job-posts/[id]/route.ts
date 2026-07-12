import { NextRequest, NextResponse } from 'next/server';
import { getEmployerSession } from '@/lib/employer-auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * P7.2 单个岗位画像管理 API
 * GET    — 岗位详情
 * PUT    — 更新岗位
 * DELETE — 关闭岗位（软删除设 status=closed）
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getEmployerSession(request);
  if (!session) {
    return NextResponse.json({ error: '接口不存在' }, { status: 404 });
  }

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('employer_job_posts')
    .select('*')
    .eq('id', id)
    .eq('employer_id', session.employerId)
    .single();

  if (error || !data) {
    if (error?.code === 'PGRST116') {
      return NextResponse.json({ error: '岗位不存在' }, { status: 404 });
    }
    console.error('[job-posts/:id GET]', error?.message);
    return NextResponse.json({ error: '查询失败' }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getEmployerSession(request);
  if (!session) {
    return NextResponse.json({ error: '接口不存在' }, { status: 404 });
  }

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '无效的请求数据' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // 先确认岗位属于当前雇主
  const { data: existing } = await supabase
    .from('employer_job_posts')
    .select('id')
    .eq('id', id)
    .eq('employer_id', session.employerId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: '岗位不存在' }, { status: 404 });
  }

  // 只更新传了值的字段
  const allowedFields = [
    'job_title', 'description', 'required_hard_skills', 'required_soft_skills',
    'target_grade', 'target_major', 'target_school', 'target_cities',
    'target_industry', 'min_completeness', 'min_assessment',
    'has_internship_required', 'graduation_year', 'auto_push', 'push_frequency', 'status',
  ];

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }

  const { data, error } = await supabase
    .from('employer_job_posts')
    .update(updateData)
    .eq('id', id)
    .eq('employer_id', session.employerId)
    .select()
    .single();

  if (error) {
    console.error('[job-posts/:id PUT]', error.message);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getEmployerSession(request);
  if (!session) {
    return NextResponse.json({ error: '接口不存在' }, { status: 404 });
  }

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  // 软删除：设 status=closed
  const { data, error } = await supabase
    .from('employer_job_posts')
    .update({ status: 'closed', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('employer_id', session.employerId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: '岗位不存在' }, { status: 404 });
    }
    console.error('[job-posts/:id DELETE]', error.message);
    return NextResponse.json({ error: '关闭失败' }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}
