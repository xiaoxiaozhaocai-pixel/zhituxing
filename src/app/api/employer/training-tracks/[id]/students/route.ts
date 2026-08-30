import { NextRequest, NextResponse } from 'next/server';
import { getEmployerSession } from '@/lib/employer-auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { execSql } from '@/lib/exec-sql';

// 昵称脱敏：保留首字 + ** 末字
function maskNickname(nickname: string | null): string {
  if (!nickname) return '匿名候选人';
  const trimmed = nickname.trim();
  if (trimmed.length <= 1) return `${trimmed}**`;
  if (trimmed.length === 2) return `${trimmed[0]}*`;
  return `${trimmed[0]}**${trimmed[trimmed.length - 1]}`;
}

export const dynamic = 'force-dynamic';

/**
 * GET /api/employer/training-tracks/:id/students - 查看培养通道已加入的学生及进度
 * 鉴权：雇主本人；返回学生列表（昵称脱敏）+ 通道阶段信息，用于进度可视化
 */
export async function GET(
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

  const supabase = getSupabaseAdmin();

  // 1. 验证培养通道属于当前雇主
  const { data: track, error: trackError } = await supabase
    .from('employer_training_tracks')
    .select('id, title, stages')
    .eq('id', trackId)
    .eq('employer_id', session.employerId)
    .single();

  if (trackError || !track) {
    return NextResponse.json({ error: '培养通道不存在或无权操作' }, { status: 404 });
  }

  // 2. 查询已加入学生 + 候选人画像信息（昵称脱敏）
  const rows = (await execSql(
    `SELECT s.id, s.user_id, s.status, s.stage_progress, s.created_at,
            p.nickname, p.grade, p.major, p.portrait_completeness_score
     FROM public.training_track_students s
     LEFT JOIN public.user_portrait_v p ON p.user_id::text = s.user_id
     WHERE s.track_id = %L
     ORDER BY s.created_at DESC`,
    trackId,
  )) as Array<{
    id: number;
    user_id: string;
    status: string;
    stage_progress: number | null;
    created_at: string;
    nickname: string | null;
    grade: string | null;
    major: string | null;
    portrait_completeness_score: number | null;
  }>;

  const students = rows.map((s) => ({
    user_id: s.user_id,
    status: s.status || 'invited',
    stage_progress: s.stage_progress,
    created_at: s.created_at,
    nickname: maskNickname(s.nickname),
    grade: s.grade,
    major: s.major,
    portrait_completeness_score: s.portrait_completeness_score,
  }));

  return NextResponse.json({
    success: true,
    data: {
      track: { id: track.id, title: track.title, stages: track.stages },
      students,
    },
  });
}

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
