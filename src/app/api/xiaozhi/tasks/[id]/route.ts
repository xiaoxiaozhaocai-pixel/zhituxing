import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUserId } from '@/lib/auth';
export const dynamic = 'force-dynamic';

const supabase = getSupabaseAdmin();

// PATCH /api/xiaozhi/tasks/:id — 更新任务状态或内容
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { id } = await params;

    const { data: existing, error: fetchError } = await supabase
      .from('mascot_task_memory')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: '任务不存在或无权操作' }, { status: 404 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.taskStatus) {
      const validStatuses = ['in_progress', 'completed', 'paused', 'abandoned'];
      if (!validStatuses.includes(body.taskStatus)) {
        return NextResponse.json({ error: `无效 taskStatus，可选: ${validStatuses.join(', ')}` }, { status: 400 });
      }
      updateData.task_status = body.taskStatus;
    }
    if (body.taskTitle) updateData.task_title = body.taskTitle;
    if (body.relatedAgent) updateData.related_agent = body.relatedAgent;
    if (body.metadata) updateData.metadata = body.metadata;

    const { data, error } = await supabase
      .from('mascot_task_memory')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('更新小职任务记忆失败:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

// DELETE /api/xiaozhi/tasks/:id — 删除一条任务记录
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { id } = await params;

    const { data: existing, error: fetchError } = await supabase
      .from('mascot_task_memory')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: '任务不存在或无权操作' }, { status: 404 });
    }

    const { error } = await supabase
      .from('mascot_task_memory')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除小职任务记忆失败:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
