import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 发表文章评论
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const { id: articleId } = await params;

    if (!userId) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const { content, parentId } = await request.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ success: false, error: '评论内容不能为空' }, { status: 400 });
    }

    if (content.length > 1000) {
      return NextResponse.json({ success: false, error: '评论内容不能超过1000字' }, { status: 400 });
    }

    // 获取用户信息
    const { data: user } = await supabase
      .from('users')
      .select('nickname, avatar_url')
      .eq('id', userId)
      .single();

    // 创建评论
    const { data: comment, error } = await supabase
      .from('article_comments')
      .insert({
        user_id: userId,
        article_id: articleId,
        content: content.trim(),
        parent_id: parentId || null
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // 更新文章评论数
    const { data: article } = await supabase
      .from('articles')
      .select('comments')
      .eq('id', articleId)
      .single();

    await supabase
      .from('articles')
      .update({ comments: (article?.comments || 0) + 1 })
      .eq('id', articleId);

    return NextResponse.json({
      success: true,
      data: {
        id: comment.id,
        content: comment.content,
        userId: comment.user_id,
        userName: user?.nickname || '匿名用户',
        userAvatar: user?.avatar_url,
        parentId: comment.parent_id,
        createdAt: comment.created_at
      }
    });

  } catch (error) {
    console.error('发表评论失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
