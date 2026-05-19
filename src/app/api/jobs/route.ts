import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const industry = searchParams.get('industry') || '';
    const city = searchParams.get('city') || '';
    const companyType = searchParams.get('companyType') || '';
    const freshOnly = searchParams.get('freshOnly') === 'true';
    const keyword = searchParams.get('keyword') || '';
    
    const offset = (page - 1) * pageSize;
    const supabaseAdmin = getSupabaseAdmin();

    // ===== 关键词搜索：使用 Supabase 查询构建器（性能优化） =====
    if (keyword) {
      // 构建 OR 条件：job_title 或 responsibilities 包含关键词
      const orConditions = `job_title.ilike.%${keyword}%,responsibilities.ilike.%${keyword}%`;
      
      // 性能优化：限制排序数据量，最多获取 MAX_SORT_LIMIT 条进行排序
      const MAX_SORT_LIMIT = 200;
      
      let query = supabaseAdmin
        .from('job_descriptions')
        .select('*', { count: 'exact' })
        .or(orConditions)
        .limit(MAX_SORT_LIMIT);  // 排序前截断，减少排序数据量
      
      // 应用额外筛选条件
      if (industry) {
        query = query.eq('industry', industry);
      }
      if (city) {
        query = query.eq('city', city);
      }
      if (freshOnly) {
        query = query.eq('fresh_graduate_friendly', true);
      }
      
      // 查询超时保护：3秒超时
      const queryPromise = query.order('created_at', { ascending: false });
      const timeoutPromise = new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('查询超时')), 3000)
      );
      
      let data: any[] | null = null;
      let error: any = null;
      let count: number | null = null;
      
      try {
        const result = await Promise.race([
          queryPromise,
          timeoutPromise
        ]) as { data: any[] | null; error: any; count: number | null };
        data = result.data;
        error = result.error;
        count = result.count;
      } catch (timeoutError) {
        console.warn('[jobs] 查询超时，返回空结果');
        return NextResponse.json({
          success: true,
          data: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0,
          timeout: true
        });
      }
      
      if (error) {
        console.error('数据库查询错误:', error);
        return NextResponse.json({ error: '查询失败' }, { status: 500 });
      }
      
      // 在 JS 中计算相关性评分并排序（最多200条，性能可控）
      const scoredData = (data || []).map(job => {
        let relevance = 3; // 默认：仅职责包含
        const titleLower = (job.job_title || '').toLowerCase();
        const keywordLower = keyword.toLowerCase();
        
        if (titleLower === keywordLower) {
          relevance = 0; // 精确匹配
        } else if (titleLower.startsWith(keywordLower)) {
          relevance = 1; // 前缀匹配
        } else if (titleLower.includes(keywordLower)) {
          relevance = 2; // 标题包含
        }
        
        return { ...job, _relevance: relevance };
      });
      
      // 按 relevance 升序排序（精确匹配在前）
      scoredData.sort((a, b) => {
        if (a._relevance !== b._relevance) {
          return a._relevance - b._relevance;
        }
        // 相关性相同时，按创建时间降序
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
      
      // 排序后分页截取
      const pagedData = scoredData.slice(offset, offset + pageSize);
      
      // 格式化返回数据
      const formattedData = pagedData.map(job => ({
        id: job.id,
        name: job.job_title,
        industry: job.industry,
        city: job.city,
        companyType: '',
        salary: job.salary_range || '面议',
        salaryMin: 0,
        salaryMax: 0,
        skills: job.skills?.split(',') || [],
        friendliness: job.fresh_graduate_friendly === true ? '极度友好' : '社招为主',
        isFreshFriendly: job.fresh_graduate_friendly === true,
        jdContent: job.responsibilities,
        _relevance: job._relevance
      }));
      
      return NextResponse.json({
        success: true,
        data: formattedData,
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
        sortedFrom: Math.min(scoredData.length, MAX_SORT_LIMIT)  // 告知前端实际排序数据量
      }, {
        headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' }
      });
    }

    // ===== 无关键词：保持原有Supabase客户端查询 =====
    let query = supabaseAdmin
      .from('job_descriptions')
      .select('*', { count: 'exact' });
    
    // 应用筛选条件
    if (industry) {
      query = query.eq('industry', industry);
    }
    if (city) {
      query = query.eq('city', city);
    }
    if (freshOnly) {
      query = query.eq('fresh_graduate_friendly', true);
    }
    
    // 分页
    const { data, error, count } = await query
      .range(offset, offset + pageSize - 1)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('数据库查询错误:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }
    
    // 格式化返回数据
    const formattedData = data?.map(job => ({
      id: job.id,
      name: job.job_title,
      industry: job.industry,
      city: job.city,
      companyType: '',
      salary: job.salary_range || '面议',
      salaryMin: 0,
      salaryMax: 0,
      skills: job.skills?.split(',') || [],
      friendliness: job.fresh_graduate_friendly === true ? '极度友好' : '社招为主',
      isFreshFriendly: job.fresh_graduate_friendly === true,
      jdContent: job.responsibilities
    })) || [];
    
    return NextResponse.json({
      success: true,
      data: formattedData,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    }, {
      headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' }
    });
  } catch (error) {
    console.error('API错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
