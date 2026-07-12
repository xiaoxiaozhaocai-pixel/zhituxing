import { NextRequest, NextResponse } from 'next/server';
import { getEmployerSession } from '@/lib/employer-auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * P5.4 培养通道 - 批量添加学生
 * POST /api/employer/training-tracks/:id/students
 * Body: { user_ids: string[] }
 * 同时为每位学生发送 type='training_invite' 的通知
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getEmployerSession(request);
  if (!session) {
    return NextResponse.json({ error: '接口不存在' }, { status: 404 });
  }

  const { id } = await params;
  const trackId = parseInt(id, 10);
  if (isNaN(trackId)) {
    return NextResponse.json({ error: '无效的培养通道 ID' }, { status: 400 });
  }

  let body: { user_ids?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '无效的请求数据' }, { status: 400 });
  }

  const { user_ids } = body;
  if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
    return NextResponse.json({ error: 'user_ids 必须为非空数组' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // 1. 验证培养通道属于当前雇主
  const { data: track, error: trackError } = await supabase
    .from('employer_training_tracks')
    .select('id, title')
    .eq('id', trackId)
    .eq('employer_id', session.employerId)
    .single();

  if (trackError || !track) {
    return NextResponse.json({ error: '培养通道不存在或无权操作' }, { status: 404 });
  }

  // 2. 批量插入学生（跳过已存在的）
  const now = new Date().toISOString();
  const studentRecords = user_ids.map((userId) => ({
    track_id: trackId,
    user_id: userId,
    status: 'invited',
    stage_progress: null,
    created_at: now,
  }));

  const { error: insertError } = await supabase
    .from('training_track_students')
    .upsert(studentRecords, {
      onConflict: 'track_id,user_id',
      ignoreDuplicates: true,
    });

  if (insertError) {
    console.error('[employer/training-tracks/students] 添加失败:', insertError.message);
    return NextResponse.json({ error: '添加学生失败' }, { status: 500 });
  }

  // 3. 同时发送通知
  const notifications = user_ids.map((userId) => ({
    user_id: userId,
    type: 'training_invite',
    title: `${session.realName} 邀请你加入培养通道「${track.title}」`,
    content: `企业 ${session.realName} 邀请你加入培养通道「${track.title}」，请查看详情并确认是否参与。`,
    is_read: false,
    is_global: false,
    created_at: now,
  }));

  const { error: notifError } = await supabase
    .from('notifications')
    .insert(notifications);

  if (notifError) {
    console.error('[employer/training-tracks/students] 发送通知失败:', notifError.message);
  }

  return NextResponse.json({
    success: true,
    data: {
      added_count: user_ids.length,
      track_title: track.title,
    },
  });
}
