export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getAuthenticatedUserId } from '@/lib/auth';

// 点赞/取消点赞文章
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabase();
    const userId = await getAuthenticatedUserId(request);
    const { id: articleId } = await params;

    if (!userId) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    // 检查是否已经点赞
    const { data: existingLike, error: checkError } = await supabase
      .from('article_likes')
      .select('*')
      .eq('user_id', userId)
      .eq('article_id', articleId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      return NextResponse.json({ success: false, error: checkError.message }, { status: 500 });
    }

    let isLiked: boolean;
    let likeCount = 0;

    if (existingLike) {
      // 取消点赞
      const { error: deleteError } = await supabase
        .from('article_likes')
        .delete()
        .eq('id', existingLike.id);

      if (deleteError) {
        return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 });
      }

      isLiked = false;

      // 更新文章点赞数
      const { data: article } = await supabase
        .from('articles')
        .select('likes')
        .eq('id', articleId)
        .single();

      likeCount = Math.max(0, (article?.likes || 0) - 1);

      await supabase
        .from('articles')
        .update({ likes: likeCount })
        .eq('id', articleId);

    } else {
      // 添加点赞
      const { error: insertError } = await supabase
        .from('article_likes')
        .insert({
          user_id: userId,
          article_id: articleId
        });

      if (insertError) {
        return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
      }

      isLiked = true;

      // 更新文章点赞数
      const { data: article } = await supabase
        .from('articles')
        .select('likes')
        .eq('id', articleId)
        .single();

      likeCount = (article?.likes || 0) + 1;

      await supabase
        .from('articles')
        .update({ likes: likeCount })
        .eq('id', articleId);
    }

    return NextResponse.json({
      success: true,
      data: {
        isLiked,
        likeCount
      }
    });

  } catch (error) {
    console.error('点赞操作失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
