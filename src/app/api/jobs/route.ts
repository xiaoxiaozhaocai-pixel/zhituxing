import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// 行业同义词映射：用户输入→数据库中的行业名
const INDUSTRY_SYNONYMS: Record<string, string[]> = {
  '会计': ['财务'],
  '财务': ['会计'],
  '教育培训': ['教育'],
  '教育': ['教育培训'],
  '文化艺术': ['传媒'],
  '传媒': ['文化艺术'],
  'IT': ['互联网/IT'],
  '互联网': ['互联网/IT'],
  '计算机': ['互联网/IT'],
  '金融投资': ['金融'],
  '机械': ['制造业'],
  '人力资源': ['人力资源'],
  'HR': ['人力资源'],
  '电商': ['电商'],
  '运营': ['市场营销', '电商'],
  '设计': ['互联网/IT'],
};

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

    // ===== 关键词搜索：多个查询合并（更可靠） =====
    if (keyword) {
      const selectFields = 'id,job_title,industry,city,salary_range,hard_skills,soft_skills,responsibilities,education,experience,created_at,fresh_graduate_friendly';
      
      const buildBaseQuery = () => {
        let q = supabaseAdmin
          .from('job_descriptions')
          .select(selectFields)
          .limit(80);
        if (industry) q = q.eq('industry', industry);
        if (city) q = q.eq('city', city);
        if (freshOnly) q = q.eq('fresh_graduate_friendly', true);
        return q;
      };
      
      // 获取同义词对应的行业名
      const synonymIndustries = INDUSTRY_SYNONYMS[keyword] || [];
      
      // 并行查询3个字符串字段 + 同义词行业查询
      // 注意：hard_skills/soft_skills 是 JSONB 数组，不能用 ilike，改用 contains
      const queries = [
        buildBaseQuery().ilike('job_title', `%${keyword}%`),
        buildBaseQuery().ilike('responsibilities', `%${keyword}%`),
        buildBaseQuery().ilike('industry', `%${keyword}%`),
        // JSONB 数组包含查询（精确匹配数组元素）
        buildBaseQuery().contains('hard_skills', [keyword]),
        buildBaseQuery().contains('soft_skills', [keyword]),
        // 同义词行业精确匹配
        ...synonymIndustries.map(syn => 
          buildBaseQuery().eq('industry', syn)
        ),
      ];
      
      const results = await Promise.all(queries);
      
      // 记录每个查询的结果状态
      console.log('[jobs] 查询结果:', results.map((r, i) => ({
        index: i,
        hasError: !!r.error,
        errorMsg: r.error?.message || null,
        dataCount: r.data?.length || 0
      })));
      
      // 检查是否所有查询都失败
      const allErrors = results.every(r => r.error);
      if (allErrors) {
        console.error('[jobs] 所有查询都失败:', JSON.stringify(results.map(r => ({
          message: r.error?.message,
          code: r.error?.code,
          details: r.error?.details
        }))));
        return NextResponse.json({ error: '查询失败' }, { status: 500 });
      }
      
      // 合并结果并去重
      const seenIds = new Set<string>();
      const uniqueResults: any[] = [];
      
      for (const result of results) {
        const data = result.data || [];
        for (const job of data) {
          if (!seenIds.has(job.id)) {
            seenIds.add(job.id);
            uniqueResults.push(job);
          }
        }
      }
      
      if (uniqueResults.length === 0) {
        return NextResponse.json({
          success: true,
          data: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0
        });
      }
      
      // 计算相关性评分
      const keywordLower = keyword.toLowerCase();
      const scoredData = uniqueResults.map(job => {
        let relevance = 5; // 默认：仅技能包含
        const titleLower = (job.job_title || '').toLowerCase();
        const industryLower = (job.industry || '').toLowerCase();
        const respLower = (job.responsibilities || '').toLowerCase();
        
        // hard_skills/soft_skills 类型安全处理：可能是数组、字符串、null、undefined
        const safeToArray = (val: any): string[] => {
          if (Array.isArray(val)) return val.map(String);
          if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean);
          if (val == null) return [];
          return [String(val)];
        };
        const hardSkillsArr = safeToArray(job.hard_skills);
        const softSkillsArr = safeToArray(job.soft_skills);
        const hardSkillsLower = hardSkillsArr.join(',').toLowerCase();
        const softSkillsLower = softSkillsArr.join(',').toLowerCase();
        
        if (titleLower === keywordLower) {
          relevance = 0;
        } else if (titleLower.startsWith(keywordLower)) {
          relevance = 1;
        } else if (titleLower.includes(keywordLower)) {
          relevance = 2;
        } else if (respLower.includes(keywordLower)) {
          relevance = 3;
        } else if (hardSkillsLower.includes(keywordLower) || softSkillsLower.includes(keywordLower)) {
          relevance = 4;
        } else if (industryLower.includes(keywordLower)) {
          relevance = 5;
        }
        
        return { ...job, _relevance: relevance };
      });
      
      scoredData.sort((a, b) => {
        if (a._relevance !== b._relevance) {
          return a._relevance - b._relevance;
        }
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
      
      const total = scoredData.length;
      const totalPages = Math.ceil(total / pageSize);
      const paginatedData = scoredData.slice(offset, offset + pageSize);
      
      const formattedData = paginatedData.map(job => {
        // 使用相同的类型安全处理函数
        const safeToArray = (val: any): string[] => {
          if (Array.isArray(val)) return val.map(String);
          if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean);
          if (val == null) return [];
          return [String(val)];
        };
        const skills = safeToArray(job.hard_skills);
        const softSkills = safeToArray(job.soft_skills);
        
        return {
          id: job.id,
          name: job.job_title,
          industry: job.industry,
          city: job.city,
          companyType: '',
          salary: job.salary_range || '面议',
          salaryMin: 0,
          salaryMax: 0,
          skills,
          softSkills,
          education: job.education || '',
          experience: job.experience || '',
          friendliness: job.fresh_graduate_friendly === true ? '极度友好' : '社招为主',
          isFreshFriendly: job.fresh_graduate_friendly === true,
          jdContent: job.responsibilities,
          _relevance: job._relevance
        };
      });
      
      return NextResponse.json({
        success: true,
        data: formattedData,
        total,
        page,
        pageSize,
        totalPages
      }, {
        headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' }
      });
    }

    // ===== 无关键词：简单筛选查询 =====
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
    const formattedData = data?.map(job => {
      // 使用类型安全处理函数
      const safeToArray = (val: any): string[] => {
        if (Array.isArray(val)) return val.map(String);
        if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean);
        if (val == null) return [];
        return [String(val)];
      };
      const skills = safeToArray(job.skills);
      
      return {
        id: job.id,
        name: job.job_title,
        industry: job.industry,
        city: job.city,
        companyType: '',
        salary: job.salary_range || '面议',
        salaryMin: 0,
        salaryMax: 0,
        skills,
        friendliness: job.fresh_graduate_friendly === true ? '极度友好' : '社招为主',
        isFreshFriendly: job.fresh_graduate_friendly === true,
        jdContent: job.responsibilities
      };
    }) || [];
    
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
  } catch (error: any) {
    console.error('API错误:', JSON.stringify({
      message: error?.message,
      stack: error?.stack?.substring(0, 500),
      name: error?.name
    }));
    return NextResponse.json({ 
      error: '服务器错误',
      details: error?.message 
    }, { status: 500 });
  }
}
