export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUserId } from '@/lib/auth';

const supabase = getSupabaseAdmin();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { data: messages, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', userId)
      .eq('session_id', id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, data: messages || [] });
  } catch (error) {
    console.error('获取会话失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { error } = await supabase
      .from('chat_history')
      .delete()
      .eq('user_id', userId)
      .eq('session_id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除会话失败:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
