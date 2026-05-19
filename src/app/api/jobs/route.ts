export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// ============================================================
// 内存缓存 - 5分钟TTL
// ============================================================
const searchCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟

function getCachedResult(key: string): any | null {
  const cached = searchCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    searchCache.delete(key);
    return null;
  }
  return cached.data;
}

function setCachedResult(key: string, data: any): void {
  // 防止缓存无限增长，超过200条时清理最旧的
  if (searchCache.size > 200) {
    const oldest = [...searchCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    if (oldest) searchCache.delete(oldest[0]);
  }
  searchCache.set(key, { data, timestamp: Date.now() });
}

// ============================================================
// 行业同义词映射：用户输入→数据库中的行业名
// ============================================================
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

// ============================================================
// 模块级工具函数
// ============================================================
function safeToArray(val: any): string[] {
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean);
  if (val == null) return [];
  return [String(val)];
}

// 搜索阶段只查轻量字段（不含responsibilities）
const LIGHT_SELECT_FIELDS = 'id,job_title,industry,city,salary_range,hard_skills,soft_skills,education,experience,created_at,fresh_graduate_friendly';

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

    // ============================================================
    // 缓存检查
    // ============================================================
    const cacheKey = `jobs:${keyword}:${industry}:${city}:${freshOnly}:${page}:${pageSize}`;
    const cached = getCachedResult(cacheKey);
    if (cached) {
      console.log('[jobs] 缓存命中:', cacheKey);
      return NextResponse.json(cached, {
        headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' }
      });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // ===== 关键词搜索：多个查询合并（更可靠） =====
    if (keyword) {
      const buildBaseQuery = () => {
        let q = supabaseAdmin
          .from('job_descriptions')
          .select(LIGHT_SELECT_FIELDS)
          .limit(50); // 减少limit，5个查询合并后已足够
        if (industry) q = q.eq('industry', industry);
        if (city) q = q.eq('city', city);
        if (freshOnly) q = q.eq('fresh_graduate_friendly', true);
        return q;
      };
      
      // 获取同义词对应的行业名
      const synonymIndustries = INDUSTRY_SYNONYMS[keyword] || [];
      
      // 并行查询3个字符串字段 + JSONB contains + 同义词行业
      const queries = [
        buildBaseQuery().ilike('job_title', `%${keyword}%`),
        buildBaseQuery().ilike('responsibilities', `%${keyword}%`),
        buildBaseQuery().ilike('industry', `%${keyword}%`),
        buildBaseQuery().contains('hard_skills', [keyword]),
        buildBaseQuery().contains('soft_skills', [keyword]),
        ...synonymIndustries.map(syn => 
          buildBaseQuery().eq('industry', syn)
        ),
      ];
      
      const results = await Promise.all(queries);
      
      // 检查是否所有查询都失败
      const allErrors = results.every(r => r.error);
      if (allErrors) {
        console.error('[jobs] 所有查询都失败');
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
        const emptyResult = {
          success: true,
          data: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0
        };
        setCachedResult(cacheKey, emptyResult);
        return NextResponse.json(emptyResult);
      }
      
      // 计算相关性评分
      const keywordLower = keyword.toLowerCase();
      const scoredData = uniqueResults.map(job => {
        let relevance = 5;
        const titleLower = (job.job_title || '').toLowerCase();
        const industryLower = (job.industry || '').toLowerCase();
        const respLower = (job.responsibilities || '').toLowerCase();
        const hardSkillsLower = safeToArray(job.hard_skills).join(',').toLowerCase();
        const softSkillsLower = safeToArray(job.soft_skills).join(',').toLowerCase();
        
        if (titleLower === keywordLower) relevance = 0;
        else if (titleLower.startsWith(keywordLower)) relevance = 1;
        else if (titleLower.includes(keywordLower)) relevance = 2;
        else if (respLower.includes(keywordLower)) relevance = 3;
        else if (hardSkillsLower.includes(keywordLower) || softSkillsLower.includes(keywordLower)) relevance = 4;
        else if (industryLower.includes(keywordLower)) relevance = 5;
        
        return { ...job, _relevance: relevance };
      });
      
      scoredData.sort((a, b) => {
        if (a._relevance !== b._relevance) return a._relevance - b._relevance;
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
      
      const total = scoredData.length;
      const totalPages = Math.ceil(total / pageSize);
      const paginatedData = scoredData.slice(offset, offset + pageSize);
      
      // ============================================================
      // 两阶段查询：只为当前页查询 responsibilities
      // ============================================================
      if (paginatedData.length > 0) {
        const pageIds = paginatedData.map(j => j.id);
        const { data: fullData } = await supabaseAdmin
          .from('job_descriptions')
          .select('id, responsibilities')
          .in('id', pageIds);
        
        // 合并 responsibilities
        if (fullData) {
          const respMap = new Map(fullData.map(d => [d.id, d.responsibilities]));
          for (const job of paginatedData) {
            job.responsibilities = respMap.get(job.id) || job.responsibilities;
          }
        }
      }
      
      const formattedData = paginatedData.map(job => ({
        id: job.id,
        name: job.job_title,
        industry: job.industry,
        city: job.city,
        companyType: '',
        salary: job.salary_range || '面议',
        salaryMin: 0,
        salaryMax: 0,
        skills: safeToArray(job.hard_skills),
        softSkills: safeToArray(job.soft_skills),
        education: job.education || '',
        experience: job.experience || '',
        friendliness: job.fresh_graduate_friendly === true ? '极度友好' : '社招为主',
        isFreshFriendly: job.fresh_graduate_friendly === true,
        jdContent: job.responsibilities,
        _relevance: job._relevance
      }));
      
      const result = {
        success: true,
        data: formattedData,
        total,
        page,
        pageSize,
        totalPages
      };
      
      setCachedResult(cacheKey, result);
      return NextResponse.json(result, {
        headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' }
      });
    }

    // ===== 无关键词：简单筛选查询 =====
    let query = supabaseAdmin
      .from('job_descriptions')
      .select('*', { count: 'exact' });
    
    if (industry) query = query.eq('industry', industry);
    if (city) query = query.eq('city', city);
    if (freshOnly) query = query.eq('fresh_graduate_friendly', true);
    
    const { data, error, count } = await query
      .range(offset, offset + pageSize - 1)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('数据库查询错误:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }
    
    const formattedData = data?.map(job => ({
      id: job.id,
      name: job.job_title,
      industry: job.industry,
      city: job.city,
      companyType: '',
      salary: job.salary_range || '面议',
      salaryMin: 0,
      salaryMax: 0,
      skills: safeToArray(job.hard_skills),
      softSkills: safeToArray(job.soft_skills),
      education: job.education || '',
      experience: job.experience || '',
      friendliness: job.fresh_graduate_friendly === true ? '极度友好' : '社招为主',
      isFreshFriendly: job.fresh_graduate_friendly === true,
      jdContent: job.responsibilities
    })) || [];
    
    const result = {
      success: true,
      data: formattedData,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    };
    
    setCachedResult(cacheKey, result);
    return NextResponse.json(result, {
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
