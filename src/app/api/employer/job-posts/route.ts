import { NextRequest, NextResponse } from 'next/server';
import { getEmployerSession } from '@/lib/employer-auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * P7.2 岗位画像管理 API
 * GET  — 查看雇主的岗位画像列表
 * POST — 创建新岗位画像
 */

// GET /api/employer/job-posts?page=1&page_size=20&status=active
export async function GET(request: NextRequest) {
  const session = await getEmployerSession(request);
  if (!session) {
    return NextResponse.json({ error: '接口不存在' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('page_size') || '20')));
  const status = searchParams.get('status'); // active / paused / closed

  const supabase = getSupabaseAdmin();

  let query = supabase
    .from('employer_job_posts')
    .select('*', { count: 'exact' })
    .eq('employer_id', session.employerId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const offset = (page - 1) * pageSize;
  query = query.range(offset, offset + pageSize - 1);

  const { data: items, error, count } = await query;

  if (error) {
    console.error('[job-posts GET]', error.message);
    return NextResponse.json({ error: '查询失败' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: {
      items: items || [],
      total: count || 0,
      page,
      page_size: pageSize,
    },
  });
}

// POST /api/employer/job-posts
export async function POST(request: NextRequest) {
  const session = await getEmployerSession(request);
  if (!session) {
    return NextResponse.json({ error: '接口不存在' }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '无效的请求数据' }, { status: 400 });
  }

  const { job_title, description } = body;
  if (!job_title || typeof job_title !== 'string' || job_title.trim().length === 0) {
    return NextResponse.json({ error: '岗位名称不能为空' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('employer_job_posts')
    .insert({
      employer_id: session.employerId,
      job_title: job_title.trim(),
      description: description || null,
      required_hard_skills: body.required_hard_skills || [],
      required_soft_skills: body.required_soft_skills || [],
      target_grade: body.target_grade || null,
      target_major: body.target_major || null,
      target_school: body.target_school || null,
      target_cities: body.target_cities || [],
      target_industry: body.target_industry || null,
      min_completeness: body.min_completeness ?? 0,
      min_assessment: body.min_assessment ?? 0,
      has_internship_required: body.has_internship_required || 'any',
      graduation_year: body.graduation_year || null,
      auto_push: body.auto_push ?? false,
      push_frequency: body.push_frequency || 'weekly',
    })
    .select()
    .single();

  if (error) {
    console.error('[job-posts POST]', error.message);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }

  return NextResponse.json({ success: true, data }, { status: 201 });
}
