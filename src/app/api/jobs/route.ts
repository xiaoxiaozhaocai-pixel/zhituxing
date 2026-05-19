import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { execSql } from '@/lib/exec-sql';

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

    // ===== 关键词搜索：使用相关性排序SQL =====
    if (keyword) {
      const safeKeyword = keyword.replace(/'/g, "''");
      
      // 构建WHERE条件
      const conditions: string[] = [
        `(job_title ILIKE '%${safeKeyword}%' OR responsibilities ILIKE '%${safeKeyword}%')`
      ];
      if (industry) conditions.push(`industry = '${industry.replace(/'/g, "''")}'`);
      if (city) conditions.push(`city = '${city.replace(/'/g, "''")}'`);
      if (freshOnly) conditions.push(`fresh_graduate_friendly = true`);
      
      const whereClause = conditions.join(' AND ');
      
      // 相关性评分：精确匹配 > 前缀匹配 > 标题包含 > 仅职责包含
      const relevanceCase = `CASE 
        WHEN job_title = '${safeKeyword}' THEN 0
        WHEN job_title ILIKE '${safeKeyword}%' THEN 1
        WHEN job_title ILIKE '%${safeKeyword}%' THEN 2
        ELSE 3
      END`;
      
      // 计数查询
      const countSql = `SELECT COUNT(*) as total FROM job_descriptions WHERE ${whereClause}`;
      const countResult = await execSql(countSql) as Array<{total: number}>;
      const total = countResult?.[0]?.total || 0;
      
      // 数据查询（按相关性排序）
      const dataSql = `SELECT *, ${relevanceCase} as relevance 
        FROM job_descriptions 
        WHERE ${whereClause}
        ORDER BY relevance ASC, created_at DESC
        LIMIT ${pageSize} OFFSET ${offset}`;
      
      const data = await execSql(dataSql) as Array<Record<string, unknown>>;
      
      // 格式化返回数据
      const formattedData = data?.map((job: Record<string, unknown>) => ({
        id: job.id,
        name: job.job_title,
        industry: job.industry,
        city: job.city,
        companyType: '',
        salary: (job.salary_range as string) || '面议',
        salaryMin: 0,
        salaryMax: 0,
        skills: typeof job.skills === 'string' ? job.skills.split(',') : [],
        friendliness: job.fresh_graduate_friendly === true ? '极度友好' : '社招为主',
        isFreshFriendly: job.fresh_graduate_friendly === true,
        jdContent: job.responsibilities
      })) || [];
      
      return NextResponse.json({
        success: true,
        data: formattedData,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }, {
        headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' }
      });
    }

    // ===== 无关键词：保持原有Supabase客户端查询 =====
    const supabaseAdmin = getSupabaseAdmin();
    
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
