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

    // ===== 关键词搜索：使用 Supabase 查询构建器（深度性能优化） =====
    if (keyword) {
      // 性能优化配置
      const MAX_RESULTS = 200;  // 最多获取条数
      const pageSize_clamped = Math.min(pageSize, 50);  // 单页最多50条
      
      // 性能优化1：select前端需要的完整字段
      const searchFields = 'id,job_title,industry,city,salary_range,hard_skills,soft_skills,responsibilities,education,experience,created_at,fresh_graduate_friendly';
      
      // 构建查询：使用 or 条件搜索 job_title 或 responsibilities
      let query = supabaseAdmin
        .from('job_descriptions')
        .select(searchFields)
        .or(`job_title.ilike.%${keyword}%,responsibilities.ilike.%${keyword}%`)
        .limit(MAX_RESULTS)
        .order('created_at', { ascending: false });
      
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
      
      // 查询超时保护：2秒超时
      const queryPromise = query;
      const timeoutPromise = new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('查询超时')), 2000)
      );
      
      let data: any[] | null = null;
      let error: any = null;
      let fastMode = false;  // 快速模式标记
      
      const startTime = Date.now();
      
      try {
        const result = await Promise.race([
          queryPromise,
          timeoutPromise
        ]) as { data: any[] | null; error: any };
        data = result.data;
        error = result.error;
      } catch (timeoutError) {
        console.warn('[jobs] 查询超时，返回空结果');
        return NextResponse.json({
          success: true,
          data: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0,
          hasMore: false,
          timeout: true
        });
      }
      
      if (error) {
        console.error('数据库查询错误:', error);
        return NextResponse.json({ error: '查询失败' }, { status: 500 });
      }
      
      const queryTime = Date.now() - startTime;
      const resultCount = (data || []).length;
      
      // 无结果时直接返回空
      if (resultCount === 0) {
        return NextResponse.json({
          success: true,
          data: [],
          total: 0,
          page,
          pageSize: pageSize_clamped,
          hasMore: false,
          queryTime,
          fastMode: false,
          sortedFrom: 0
        });
      }
      
      // 性能优化2：结果数>100时，直接返回前N条不排序（快速模式）
      const FAST_MODE_THRESHOLD = 100;
      let sortedData: any[];
      
      if (resultCount > FAST_MODE_THRESHOLD) {
        // 快速模式：直接使用Supabase排序结果，不做相关性排序
        fastMode = true;
        sortedData = (data || []).slice(0, pageSize_clamped);
      } else {
        // 标准模式：计算相关性评分并排序
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
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        });
        
        sortedData = scoredData.slice(0, pageSize_clamped);
      }
      
      // 格式化返回数据（包含前端需要的所有字段）
      const formattedData = sortedData.map(job => ({
        id: job.id,
        name: job.job_title,
        industry: job.industry,
        city: job.city,
        companyType: '',
        salary: job.salary_range || '面议',
        salaryMin: 0,
        salaryMax: 0,
        skills: job.hard_skills?.split(',') || [],
        softSkills: job.soft_skills?.split(',') || [],
        education: job.education || '',
        experience: job.experience || '',
        friendliness: job.fresh_graduate_friendly === true ? '极度友好' : '社招为主',
        isFreshFriendly: job.fresh_graduate_friendly === true,
        jdContent: job.responsibilities,
        _relevance: job._relevance
      }));
      
      return NextResponse.json({
        success: true,
        data: formattedData,
        total: resultCount,  // 当前页的结果数，不是总数
        page,
        pageSize: pageSize_clamped,
        hasMore: resultCount >= MAX_RESULTS,  // 是否可能有更多结果
        queryTime,  // 查询耗时（毫秒）
        fastMode,  // 是否快速模式
        sortedFrom: resultCount  // 告知前端实际数据量
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
