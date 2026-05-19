import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

// 获取文章列表
export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (category) {
      query = query.eq('category', category);
    }

    const { data: articles, error, count } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        articles: (articles || []).map(a => ({
          id: a.id,
          title: a.title,
          summary: a.summary,
          category: a.category,
          tags: a.tags || [],
          views: a.views || 0,
          isFeatured: a.is_featured || false,
          author: a.author,
          createdAt: a.created_at
        })),
        total: count || 0,
        page,
        limit
      }
    });

  } catch (error) {
    console.error('获取文章列表失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}

// 创建文章
export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  try {
    const body = await request.json();
    const { title, summary, category, tags, content } = body;

    if (!title || !category) {
      return NextResponse.json({ success: false, error: '缺少必填字段' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('articles')
      .insert({
        title,
        summary: summary || '',
        category,
        tags: tags || [],
        content: content || '',
        views: 0,
        is_featured: false
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('创建文章失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
