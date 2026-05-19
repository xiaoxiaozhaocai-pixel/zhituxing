import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const supabase = getSupabaseAdmin();

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');

    const { data: history, error } = await supabase
      .from('assessment_results')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({ success: true, data: history || [] });
  } catch (error) {
    console.error('获取测评历史失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}
