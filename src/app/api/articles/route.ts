import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

// 获取文章列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const featured = searchParams.get('featured');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let whereClause = `WHERE is_published = TRUE`;
    if (category) {
      whereClause += ` AND category = '${category}'`;
    }
    if (featured === 'true') {
      whereClause += ` AND is_featured = TRUE`;
    }

    const result = await execSql(
      `SELECT id, title, summary, cover_image, category, tags, views, is_featured, author, created_at
       FROM articles
       ${whereClause}
       ORDER BY is_featured DESC, created_at DESC
       LIMIT ${limit} OFFSET ${offset}`
    );

    // 获取总数
    const countResult = await execSql(
      `SELECT COUNT(*) as total FROM articles ${whereClause}`
    );
    const total = countResult && countResult.length > 0 
      ? parseInt((countResult[0] as { total: string }).total) || 0 
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        articles: (result || []).map((a: unknown) => {
          const article = a as {
            id: string;
            title: string;
            summary: string | null;
            cover_image: string | null;
            category: string;
            tags: string[] | null;
            views: number;
            is_featured: boolean;
            author: string | null;
            created_at: string;
          };
          return {
            id: article.id,
            title: article.title,
            summary: article.summary,
            coverImage: article.cover_image,
            category: article.category,
            tags: article.tags || [],
            views: article.views,
            isFeatured: article.is_featured,
            author: article.author,
            createdAt: article.created_at
          };
        }),
        total
      }
    });

  } catch (error) {
    console.error('获取文章失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
