export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

// 获取文章评论列表
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabase();
    const { id: articleId } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // 获取评论列表
    const { data: comments, error, count } = await supabase
      .from('article_comments')
      .select(`
        *,
        user:users(id, nickname, avatar_url)
      `, { count: 'exact' })
      .eq('article_id', articleId)
      .is('parent_id', null) // 只获取顶级评论
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // 获取每个评论的回复
    const commentsWithReplies = await Promise.all(
      (comments || []).map(async (comment) => {
        const { data: replies } = await supabase
          .from('article_comments')
          .select(`
            *,
            user:users(id, nickname, avatar_url)
          `)
          .eq('parent_id', comment.id)
          .order('created_at', { ascending: true });

        return {
          id: comment.id,
          content: comment.content,
          userId: comment.user_id,
          userName: comment.user?.nickname || '匿名用户',
          userAvatar: comment.user?.avatar_url,
          createdAt: comment.created_at,
          replies: (replies || []).map(r => ({
            id: r.id,
            content: r.content,
            userId: r.user_id,
            userName: r.user?.nickname || '匿名用户',
            userAvatar: r.user?.avatar_url,
            createdAt: r.created_at
          }))
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        comments: commentsWithReplies,
        total: count || 0,
        page,
        limit
      }
    });

  } catch (error) {
    console.error('获取评论列表失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
