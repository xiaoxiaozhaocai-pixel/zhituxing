import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const supabase = getSupabaseAdmin();

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const type = request.nextUrl.searchParams.get('type');

    let query = supabase
      .from('favorites')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }

    const { data: favorites, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, data: favorites || [] });
  } catch (error) {
    console.error('获取收藏失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { type, targetId, title, data } = body;

    const { data: favorite, error } = await supabase
      .from('favorites')
      .insert({
        user_id: userId,
        type,
        target_id: targetId,
        title,
        data,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data: favorite });
  } catch (error) {
    console.error('添加收藏失败:', error);
    return NextResponse.json({ error: '添加失败' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const targetId = request.nextUrl.searchParams.get('targetId');
    const type = request.nextUrl.searchParams.get('type');

    if (!targetId || !type) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('target_id', targetId)
      .eq('type', type);

    if (error) throw error;

    return NextResponse.json({ success: true, message: '取消收藏成功' });
  } catch (error) {
    console.error('取消收藏失败:', error);
    return NextResponse.json({ error: '取消失败' }, { status: 500 });
  }
}
