import { NextRequest, NextResponse } from 'next/server';
import { getEmployerSession } from '@/lib/employer-auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * P5.3 批量推送候选人
 * POST /api/employer/push
 * Body: { candidate_user_ids: string[], message: string, job_ids?: string[] }
 * 向每位候选人发送一条 type='employer_push' 的通知
 */
export async function POST(request: NextRequest) {
  const session = await getEmployerSession(request);
  if (!session) {
    return NextResponse.json({ error: '接口不存在' }, { status: 404 });
  }

  let body: { candidate_user_ids?: string[]; message?: string; job_ids?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '无效的请求数据' }, { status: 400 });
  }

  const { candidate_user_ids, message, job_ids: _job_ids } = body;

  if (!candidate_user_ids || !Array.isArray(candidate_user_ids) || candidate_user_ids.length === 0) {
    return NextResponse.json({ error: 'candidate_user_ids 必须为非空数组' }, { status: 400 });
  }
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return NextResponse.json({ error: 'message 不能为空' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // 构造通知记录
  const now = new Date().toISOString();
  const notifications = candidate_user_ids.map((userId) => ({
    user_id: userId,
    type: 'employer_push',
    title: `${session.realName} 向你发送了职位邀请`,
    content: message.trim(),
    is_read: false,
    is_global: false,
    created_at: now,
  }));

  const { error } = await supabase.from('notifications').insert(notifications);

  if (error) {
    console.error('[employer/push] 插入通知失败:', error.message);
    return NextResponse.json({ error: '推送失败' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: {
      pushed_count: candidate_user_ids.length,
    },
  });
}
