import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

// 获取文章详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 先获取文章
    const result = await execSql(
      `SELECT id, title, summary, content, cover_image, category, tags, views, is_featured, author, source, created_at, updated_at
       FROM articles
       WHERE id = '${id}' AND is_published = TRUE`
    );

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: '文章不存在' },
        { status: 404 }
      );
    }

    // 增加浏览量
    await execSql(
      `UPDATE articles SET views = views + 1 WHERE id = '${id}'`
    );

    const article = result[0] as {
      id: string;
      title: string;
      summary: string | null;
      content: string;
      cover_image: string | null;
      category: string;
      tags: string[] | null;
      views: number;
      is_featured: boolean;
      author: string | null;
      source: string | null;
      created_at: string;
      updated_at: string;
    };

    return NextResponse.json({
      success: true,
      data: {
        id: article.id,
        title: article.title,
        summary: article.summary,
        content: article.content,
        coverImage: article.cover_image,
        category: article.category,
        tags: article.tags || [],
        views: article.views + 1,
        isFeatured: article.is_featured,
        author: article.author,
        source: article.source,
        createdAt: article.created_at,
        updatedAt: article.updated_at
      }
    });

  } catch (error) {
    console.error('获取文章详情失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
