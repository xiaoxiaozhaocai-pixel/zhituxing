import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

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
    
    // 构建查询
    let query = supabaseAdmin
      .from('jobs')
      .select('*', { count: 'exact' });
    
    // 应用筛选条件
    if (industry) {
      query = query.eq('industry', industry);
    }
    if (city) {
      query = query.eq('city', city);
    }
    if (companyType) {
      query = query.eq('company_type', companyType);
    }
    if (freshOnly) {
      query = query.eq('is_fresh_friendly', 1);
    }
    if (keyword) {
      query = query.or(`job_name.ilike.%${keyword}%,skills.ilike.%${keyword}%`);
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
      name: job.job_name,
      industry: job.industry,
      city: job.city,
      companyType: job.company_type,
      salary: `${job.salary_min/1000}k-${job.salary_max/1000}k`,
      salaryMin: job.salary_min,
      salaryMax: job.salary_max,
      skills: job.skills?.split(',') || [],
      friendliness: job.is_fresh_friendly === 1 ? '极度友好' : '社招为主',
      isFreshFriendly: job.is_fresh_friendly === 1,
      jdContent: job.jd_content
    })) || [];
    
    return NextResponse.json({
      success: true,
      data: formattedData,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    });
  } catch (error) {
    console.error('API错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
