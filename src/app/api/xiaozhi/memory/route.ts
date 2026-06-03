export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUserId } from '@/lib/auth';

const supabase = getSupabaseAdmin();

// POST /api/xiaozhi/memory — 存一条情绪/事件/目标记忆
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { memoryType, content, followUpDate } = body;

    if (!memoryType || !content) {
      return NextResponse.json({ error: '缺少必填参数 memoryType / content' }, { status: 400 });
    }

    const validTypes = ['emotion', 'event', 'goal', 'milestone'];
    if (!validTypes.includes(memoryType)) {
      return NextResponse.json({ error: `无效 memoryType，可选: ${validTypes.join(', ')}` }, { status: 400 });
    }

    const { data: memory, error } = await supabase
      .from('mascot_emotional_memory')
      .insert({
        user_id: userId,
        memory_type: memoryType,
        content,
        follow_up_date: followUpDate || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data: memory });
  } catch (error) {
    console.error('保存小职情绪记忆失败:', error);
    return NextResponse.json({ error: '保存失败' }, { status: 500 });
  }
}

// GET /api/xiaozhi/memory — 查用户的情绪记忆列表
// 参数: ?type=emotion&pending=true&limit=20
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const type = request.nextUrl.searchParams.get('type');
    const pending = request.nextUrl.searchParams.get('pending');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20', 10);

    let query = supabase
      .from('mascot_emotional_memory')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 50));

    if (type) {
      query = query.eq('memory_type', type);
    }

    if (pending === 'true') {
      // 待主动关心的记忆：有 follow_up_date 且尚未 follow_up
      query = query
        .not('follow_up_date', 'is', null)
        .eq('is_followed_up', false)
        .lte('follow_up_date', new Date().toISOString());
    }

    const { data: memories, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, data: memories || [] });
  } catch (error) {
    console.error('获取小职情绪记忆失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}
