import { safeErrorMessage } from '@/lib/api-error';
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

// 获取单个文章
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabase();
    const { id } = await params;

    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ success: false, error: '文章不存在' }, { status: 404 });
    }

    // 增加浏览量
    await supabase
      .from('articles')
      .update({ views: (data.views || 0) + 1 })
      .eq('id', id);

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        title: data.title,
        summary: data.summary,
        category: data.category,
        tags: data.tags || [],
        content: data.content,
        views: (data.views || 0) + 1,
        isFeatured: data.is_featured,
        isPublished: data.is_published,
        createdAt: data.created_at
      }
    });

  } catch (error) {
    console.error('获取文章详情失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}

// 更新文章
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabase();
    const { id } = await params;
    const body = await request.json();
    const { title, summary, category, tags, content, isFeatured } = body;

    const { data, error } = await supabase
      .from('articles')
      .update({
        title,
        summary,
        category,
        tags,
        content,
        is_featured: isFeatured
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('更新文章失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}

// 删除文章
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabase();
    const { id } = await params;

    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('删除文章失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
