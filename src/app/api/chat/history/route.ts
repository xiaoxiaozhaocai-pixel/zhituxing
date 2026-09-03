import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUserId } from '@/lib/auth';
export const dynamic = 'force-dynamic';

const supabase = getSupabaseAdmin();

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');
    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0');
    const cid = request.nextUrl.searchParams.get('conversation_id');

    // 有 conversation_id 时按会话过滤，并按 created_at 升序返回（时间线回显，供小职聊天页回显历史）
    // 无 conversation_id 保持旧行为（降序，个人中心对话历史页使用，向后兼容）
    const ascending = cid ? true : false;

    let query = supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', userId);
    if (cid) query = query.eq('conversation_id', cid);

    const { data: history, error } = await query
      .order('created_at', { ascending })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({ success: true, data: history || [] });
  } catch (error) {
    console.error('获取历史失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}
