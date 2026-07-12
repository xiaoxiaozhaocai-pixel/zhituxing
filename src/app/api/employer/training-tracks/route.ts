import { NextRequest, NextResponse } from 'next/server';
import { getEmployerSession } from '@/lib/employer-auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * P5.4 企业定制培养通道
 * GET /api/employer/training-tracks - 查看自己的培养通道列表
 * POST /api/employer/training-tracks - 创建培养通道
 */

export async function GET(request: NextRequest) {
  const session = await getEmployerSession(request);
  if (!session) {
    return NextResponse.json({ error: '接口不存在' }, { status: 404 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('employer_training_tracks')
    .select('*')
    .eq('employer_id', session.employerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[employer/training-tracks] 查询失败:', error.message);
    return NextResponse.json({ error: '查询失败' }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: data || [] });
}

export async function POST(request: NextRequest) {
  const session = await getEmployerSession(request);
  if (!session) {
    return NextResponse.json({ error: '接口不存在' }, { status: 404 });
  }

  let body: {
    title?: string;
    description?: string;
    target_skills?: string[];
    target_grades?: string[];
    duration_weeks?: number;
    stages?: unknown[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '无效的请求数据' }, { status: 400 });
  }

  const { title, description, target_skills, target_grades, duration_weeks, stages } = body;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return NextResponse.json({ error: 'title 不能为空' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('employer_training_tracks')
    .insert({
      employer_id: session.employerId,
      title: title.trim(),
      description: description || null,
      target_skills: target_skills || [],
      target_grades: target_grades || [],
      duration_weeks: duration_weeks || null,
      stages: stages || null,
    })
    .select()
    .single();

  if (error) {
    console.error('[employer/training-tracks] 创建失败:', error.message);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }

  return NextResponse.json({ success: true, data }, { status: 201 });
}
