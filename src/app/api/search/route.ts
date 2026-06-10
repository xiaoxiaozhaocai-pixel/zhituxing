import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
export const dynamic = 'force-dynamic';

// 全站搜索
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const type = searchParams.get('type'); // jobs, articles, all
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!q || q.trim().length < 2) {
      return NextResponse.json(
        { error: '搜索关键词至少2个字符' },
        { status: 400 }
      );
    }

    const keyword = q.trim();
    const results: {
      jobs: Array<{
        id: string;
        jobTitle: string;
        company: string | null;
        salary: string | null;
        location: string | null;
        type: string;
      }>;
      articles: Array<{
        id: string;
        title: string;
        summary: string | null;
        category: string;
        views: number;
      }>;
    } = {
      jobs: [],
      articles: []
    };

    // 搜索岗位
    if (!type || type === 'all' || type === 'jobs') {
      // 这里模拟岗位搜索，实际应该连接真实岗位数据库
      const mockJobs = [
        { id: 'job-1', jobTitle: '前端开发工程师', company: '字节跳动', salary: '25k-40k', location: '北京', type: '技术' },
        { id: 'job-2', jobTitle: 'Java开发工程师', company: '阿里巴巴', salary: '30k-50k', location: '杭州', type: '技术' },
        { id: 'job-3', jobTitle: '产品经理', company: '腾讯', salary: '28k-45k', location: '深圳', type: '产品' },
        { id: 'job-4', jobTitle: 'UI设计师', company: '美团', salary: '20k-35k', location: '北京', type: '设计' },
        { id: 'job-5', jobTitle: '数据分析师', company: '京东', salary: '22k-38k', location: '北京', type: '数据' },
      ];

      // 过滤匹配的岗位
      const matchedJobs = mockJobs.filter(job =>
        job.jobTitle.includes(keyword) ||
        job.company.includes(keyword) ||
        job.type.includes(keyword)
      ).slice(0, limit);

      results.jobs = matchedJobs;
    }

    // 搜索文章
    if (!type || type === 'all' || type === 'articles') {
      try {
        const supabase = getSupabaseAdmin();
        const { data: articlesResult, error } = await supabase
          .from('articles')
          .select('id, title, summary, category, views')
          .or(`title.ilike.%${keyword}%,summary.ilike.%${keyword}%`)
          .order('views', { ascending: false })
          .limit(limit);

        if (!error && articlesResult) {
          results.articles = articlesResult.map(a => ({
            id: a.id,
            title: a.title,
            summary: a.summary,
            category: a.category,
            views: a.views
          }));
        }
      } catch (error) {
        console.error('搜索文章失败:', error);
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      query: q
    }, {
      headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' }
    });

  } catch (error) {
    console.error('搜索失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
