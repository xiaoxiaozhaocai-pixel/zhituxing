export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const supabase = getSupabaseAdmin();

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, role, content, metadata } = body;

    const { data: message, error } = await supabase
      .from('chat_history')
      .insert({
        user_id: userId,
        session_id: sessionId,
        role,
        content,
        metadata,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // 更新会话时间
    await supabase
      .from('chat_sessions')
      .upsert({
        user_id: userId,
        session_id: sessionId,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,session_id' });

    return NextResponse.json({ success: true, data: message });
  } catch (error) {
    console.error('保存消息失败:', error);
    return NextResponse.json({ error: '保存失败' }, { status: 500 });
  }
}
