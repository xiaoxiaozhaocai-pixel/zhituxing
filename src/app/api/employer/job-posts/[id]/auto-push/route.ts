import { NextRequest, NextResponse } from 'next/server';
import { getEmployerSession } from '@/lib/employer-auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * P7.2 自动推送设置 API
 * POST — 设置自动推送开关/频率
 * GET  — 获取上次推送时间和匹配增量
 */

// POST /api/employer/job-posts/:id/auto-push
// Body: { auto_push: boolean, push_frequency?: 'daily' | 'weekly' }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getEmployerSession(request);
  if (!session) {
    return NextResponse.json({ error: '接口不存在' }, { status: 404 });
  }

  const { id } = await params;

  let body: { auto_push?: boolean; push_frequency?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '无效的请求数据' }, { status: 400 });
  }

  if (typeof body.auto_push !== 'boolean') {
    return NextResponse.json({ error: 'auto_push 必须为布尔值' }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {
    auto_push: body.auto_push,
    updated_at: new Date().toISOString(),
  };

  if (body.push_frequency) {
    if (!['daily', 'weekly'].includes(body.push_frequency)) {
      return NextResponse.json({ error: 'push_frequency 必须为 daily 或 weekly' }, { status: 400 });
    }
    updateData.push_frequency = body.push_frequency;
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('employer_job_posts')
    .update(updateData)
    .eq('id', id)
    .eq('employer_id', session.employerId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: '岗位不存在' }, { status: 404 });
    }
    console.error('[auto-push POST]', error.message);
    return NextResponse.json({ error: '设置失败' }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

// GET /api/employer/job-posts/:id/auto-push
// 返回上次推送时间和匹配增量
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

  // 获取岗位信息
  const { data: post } = await supabase
    .from('employer_job_posts')
    .select('id, auto_push, push_frequency, updated_at')
    .eq('id', id)
    .eq('employer_id', session.employerId)
    .single();

  if (!post) {
    return NextResponse.json({ error: '岗位不存在' }, { status: 404 });
  }

  // 计算上次推送后的新增匹配
  const lastPushAt = post.updated_at;
  const { count: newMatches } = await supabase
    .from('employer_job_matches')
    .select('*', { count: 'exact', head: true })
    .eq('job_post_id', id)
    .gte('matched_at', lastPushAt);

  return NextResponse.json({
    success: true,
    data: {
      auto_push: post.auto_push,
      push_frequency: post.push_frequency,
      last_push_at: lastPushAt,
      new_matches_since_last_push: newMatches || 0,
    },
  });
}
