export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUserId } from '@/lib/auth';

const supabase = getSupabaseAdmin();

// PATCH /api/xiaozhi/memory/:id/follow-up — 标记为已主动关心
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { id } = params;

    // 验证这条记忆属于该用户
    const { data: existing, error: fetchError } = await supabase
      .from('mascot_emotional_memory')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: '记忆不存在或无权操作' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('mascot_emotional_memory')
      .update({ is_followed_up: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('标记已关心失败:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}
