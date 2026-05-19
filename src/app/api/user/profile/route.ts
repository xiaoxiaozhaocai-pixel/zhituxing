import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const supabase = getSupabaseAdmin();

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    console.error('获取用户画像失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .update(body)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    console.error('更新用户画像失败:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
