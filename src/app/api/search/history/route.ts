export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getAuthenticatedUserId } from '@/lib/auth';

// 保存搜索历史
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { userId, keyword, searchType = 'general' } = await request.json();

    if (!userId || !keyword) {
      return NextResponse.json({ success: false, error: '缺少必要参数' }, { status: 400 });
    }

    // 关键词去重：删除该用户相同关键词的旧记录
    await supabase
      .from('search_histories')
      .delete()
      .eq('user_id', userId)
      .eq('keyword', keyword);

    // 保存新搜索记录
    const { data, error } = await supabase
      .from('search_histories')
      .insert({
        user_id: userId,
        keyword: keyword.trim(),
        search_type: searchType
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('保存搜索历史失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}

// 获取搜索历史
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const userId = await getAuthenticatedUserId(request);

    if (!userId) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const { data, error } = await supabase
      .from('search_histories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        histories: (data || []).map(h => ({
          id: h.id,
          keyword: h.keyword,
          searchType: h.search_type,
          createdAt: h.created_at
        }))
      }
    });

  } catch (error) {
    console.error('获取搜索历史失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
