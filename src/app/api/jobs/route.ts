export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sanitizeJDList } from '@/lib/jd-sanitizer';
import { PUBLIC_JD_FIELDS } from '@/lib/rag-utils';

// ============================================================
// 内存缓存 - Edge Runtime 下为 best-effort（同实例命中时更快）
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
/**
 * 安全转换为字符串数组
 * 支持多种格式：
 * - 真数组：["Python", "SQL"]
 * - JSON字符串：'["Python", "SQL"]'
 * - 逗号分隔字符串：'Python, SQL'
 * - 双重转义JSON：'"[\"Python\"]"'
 * - null/undefined
 */
function safeToArray(val: any): string[] {
  // null/undefined
  if (val == null) return [];
  
  // 真数组
  if (Array.isArray(val)) {
    return val.map(item => {
      // 处理数组元素仍为 JSON 字符串的情况
      if (typeof item === 'string') {
        const parsed = tryParseJson(item);
        if (Array.isArray(parsed)) return parsed;
      }
      return String(item);
    }).flat();
  }
  
  // 字符串：可能是 JSON 或逗号分隔
  if (typeof val === 'string') {
    const trimmed = val.trim();
    
    // 尝试 JSON 解析
    const parsed = tryParseJson(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map(String);
    }
    
    // 逗号分隔
    return trimmed.split(',').map(s => s.trim()).filter(Boolean);
  }
  
  // 其他类型
  return [String(val)];
}

/**
 * 尝试解析 JSON 字符串（支持多层转义）
 */
function tryParseJson(str: string): any {
  try {
    let result = JSON.parse(str);
    // 处理双重转义：解析结果仍是字符串
    if (typeof result === 'string') {
      try {
        result = JSON.parse(result);
      } catch {
        // 不是 JSON，保持原值
      }
    }
    return result;
  } catch {
    return null;
  }
}

// 搜索阶段只查轻量字段（不含responsibilities）
const LIGHT_SELECT_FIELDS = 'id,job_title,industry,city,salary_range,hard_skills,soft_skills,education,experience,created_at,fresh_graduate_friendly,graduate_friendly_level,core_duty_module,major_require,bonus_skill_cert,post_category,competency_weights';

// 格式化单条职位数据
function formatJob(job: any, relevance?: number) {
  const hardSkills = safeToArray(job.hard_skills);
  const softSkills = safeToArray(job.soft_skills);
  
  // skills 逻辑：优先 hard_skills，为空则用 soft_skills
  const skills = hardSkills.length > 0 ? hardSkills : softSkills;
  
  // 解析薪资范围
  const salaryRange = job.salary_range || '';
  let salaryMin: number | null = null;
  let salaryMax: number | null = null;
  
  if (salaryRange && salaryRange !== '面议') {
    // 尝试解析 "8-15K" "8000-15000" "8K-15K" 等格式
    const match = salaryRange.match(/(\d+(?:\.\d+)?)\s*[Kk千]?\s*[-~到]\s*(\d+(?:\.\d+)?)\s*[Kk千]?/);
    if (match) {
      let min = parseFloat(match[1]);
      let max = parseFloat(match[2]);
      // 如果数字较小且单位是K，则乘以1000
      if (salaryRange.toLowerCase().includes('k') || (min < 100 && max < 100)) {
        min *= 1000;
        max *= 1000;
      }
      salaryMin = Math.round(min);
      salaryMax = Math.round(max);
    }
  }
  
  const base = {
    id: job.id,
    name: job.job_title,
    industry: job.industry,
    city: job.city,
    companyType: '',
    salary: salaryRange || '面议',
    skills,
    softSkills,
    education: job.education || '',
    experience: job.experience || '',
    friendliness: job.fresh_graduate_friendly === true ? '极度友好' : '社招为主',
    isFreshFriendly: job.fresh_graduate_friendly === true,
    jdContent: job.responsibilities,
    // 结构化字段
    coreDutyModule: job.core_duty_module || '',
    hardSkills,
    majorRequire: job.major_require || '',
    bonusSkillCert: job.bonus_skill_cert || '',
    postCategory: job.post_category || '',
    graduateFriendlyLevel: job.graduate_friendly_level || '',
    competencyWeights: job.competency_weights || null,
  };
  
  // 只有解析到薪资时才添加 salaryMin/salaryMax
  if (salaryMin !== null && salaryMax !== null) {
    return { ...base, salaryMin, salaryMax };
  }
  
  // 添加相关性评分（如果有）
  if (relevance !== undefined) {
    return { ...base, _relevance: relevance };
  }
  
  return base;
}

// 关键词白名单：允许中英文、数字、空格、常用符号
const KEYWORD_REGEX = /^[\w\s\u4e00-\u9fa5\-+,.]+$/;
const MAX_KEYWORD_LENGTH = 50;
const MAX_PAGE_SIZE = 100;

export async function GET(request: NextRequest) {
  try {
    // ============================================================
    // 安全检查：认证校验
    // ============================================================
    const accessToken = request.cookies.get('sb-access-token');
    const isAuthenticated = !!accessToken;
    
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    // 未登录用户限制每页最多50条，登录用户最多100条
    const maxPageSize = isAuthenticated ? MAX_PAGE_SIZE : 50;
    const pageSize = Math.min(maxPageSize, Math.max(1, parseInt(searchParams.get('pageSize') || '20')));
    const industry = searchParams.get('industry') || '';
    const city = searchParams.get('city') || '';
    const freshOnly = searchParams.get('freshOnly') === 'true';
    const education = searchParams.get('education') || '';
    const experience = searchParams.get('experience') || '';
    const companyType = searchParams.get('companyType') || '';
    const keyword = searchParams.get('keyword') || '';
    
    // ============================================================
    // 安全校验：关键词白名单
    // ============================================================
    if (keyword) {
      if (keyword.length > MAX_KEYWORD_LENGTH) {
        return NextResponse.json({
          success: true,
          data: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0
        });
      }
      if (!KEYWORD_REGEX.test(keyword)) {
        return NextResponse.json({
          success: true,
          data: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0
        });
      }
    }
    
    const offset = (page - 1) * pageSize;

    // ============================================================
    // 缓存检查
    // ============================================================
    const cacheKey = `jobs:${keyword}:${industry}:${city}:${freshOnly}:${education}:${experience}:${companyType}:${page}:${pageSize}`;
    const cached = getCachedResult(cacheKey);
    if (cached) {
      console.log('[jobs] 缓存命中:', cacheKey);
      return NextResponse.json(cached, {
        headers: { 'Cache-Control': 'public, max-age=120, stale-while-revalidate=300' }
      });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // ===== 关键词搜索：核心查询合并 =====
    if (keyword) {
      const buildBaseQuery = () => {
        let q = (supabaseAdmin as any)
          .from('job_descriptions')
          .select(LIGHT_SELECT_FIELDS)
          .or('is_synthetic.is.null,is_synthetic.eq.false')
          .limit(500);
        if (industry && industry !== '全部') q = q.eq('industry', industry);
        if (city && city !== '全国') q = q.eq('city', city);
        if (freshOnly) q = q.eq('fresh_graduate_friendly', true);
        if (education && education !== '不限') q = q.eq('education', education);
        if (companyType && companyType !== '全部') q = q.eq('company_type', companyType);
        if (experience && experience !== '不限') {
          // Map front-end categories to DB value patterns using ilike
          const expMap: Record<string, string[]> = {
            '应届生': ['应届%', '%应届%'],
            '1-3年': ['1-3年%', '%1年%', '%1-2%'],
            '3-5年': ['3-5年%', '%3年%'],
            '5年以上': ['5-%', '%5年以上%', '%6年%', '%7年%', '%8年%', '%10年%'],
          };
          const patterns = expMap[experience];
          if (patterns && patterns.length > 0) {
            const orFilter = patterns.map((p: string) => 'experience.ilike.' + p).join(',');
            q = q.or(orFilter);
          }
        }
        return q;
      };
      
      // 获取同义词对应的行业名
      const synonymIndustries = INDUSTRY_SYNONYMS[keyword] || [];
      
      // 并行查询：job_title + industry + skills
      // skills 查询：contains 用于 JSONB 数组，ilike 用于 JSON 字符串格式
      const queries = [
        buildBaseQuery().ilike('job_title', `%${keyword}%`),
        buildBaseQuery().ilike('industry', `%${keyword}%`),
        // JSONB 数组 contains 查询
        buildBaseQuery().contains('hard_skills', [keyword]),
        buildBaseQuery().contains('soft_skills', [keyword]),
        // JSON 字符串 ilike fallback（匹配 "keyword" 或 ,keyword, 格式）
        buildBaseQuery().ilike('hard_skills', `%"${keyword}"%`),
        buildBaseQuery().ilike('soft_skills', `%"${keyword}"%`),
        // 同义词行业精确匹配
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
        return NextResponse.json(emptyResult, {
          headers: { 'Cache-Control': 'public, max-age=120, stale-while-revalidate=300' }
        });
      }
      
      // 计算相关性评分（简化版，去掉 responsibilities 匹配）
      const keywordLower = keyword.toLowerCase();
      const scoredData = uniqueResults.map(job => {
        let relevance = 5; // 默认：同义词行业匹配
        const titleLower = (job.job_title || '').toLowerCase();
        const industryLower = (job.industry || '').toLowerCase();
        const hardSkillsLower = safeToArray(job.hard_skills).join(',').toLowerCase();
        const softSkillsLower = safeToArray(job.soft_skills).join(',').toLowerCase();
        
        if (titleLower === keywordLower) relevance = 0;           // 精确匹配
        else if (titleLower.startsWith(keywordLower)) relevance = 1; // 前缀匹配
        else if (titleLower.includes(keywordLower)) relevance = 2;   // 包含匹配
        else if (hardSkillsLower.includes(keywordLower) || softSkillsLower.includes(keywordLower)) relevance = 3; // 技能匹配
        else if (industryLower.includes(keywordLower)) relevance = 4; // 行业匹配
        // relevance = 5 表示同义词行业匹配
        
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
      
      const formattedData = paginatedData.map(job => formatJob(job, job._relevance));
      
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
        headers: { 'Cache-Control': 'public, max-age=120, stale-while-revalidate=300' }
      });
    }

    // ===== 无关键词：简单筛选查询 =====
    let query = (supabaseAdmin as any)
      .from('job_descriptions')
      .select(PUBLIC_JD_FIELDS, { count: 'exact' })
      .or('is_synthetic.is.null,is_synthetic.eq.false');
    
    if (industry && industry !== '全部') query = query.eq('industry', industry);
    if (city && city !== '全国') query = query.eq('city', city);
    if (freshOnly) query = query.eq('fresh_graduate_friendly', true);
    if (education && education !== '不限') query = query.eq('education', education);
    if (companyType && companyType !== '全部') query = query.eq('company_type', companyType);
    if (experience && experience !== '不限') {
      // Map front-end categories to DB value patterns using ilike
      const expMap: Record<string, string[]> = {
        '应届生': ['应届%', '%应届%'],
        '1-3年': ['1-3年%', '%1年%', '%1-2%'],
        '3-5年': ['3-5年%', '%3年%'],
        '5年以上': ['5-%', '%5年以上%', '%6年%', '%7年%', '%8年%', '%10年%'],
      };
      const patterns = expMap[experience];
      if (patterns && patterns.length > 0) {
        const orFilter = patterns.map((p: string) => 'experience.ilike.' + p).join(',');
        query = query.or(orFilter);
      }
    }
    
    const { data, error, count } = await query
      .range(offset, offset + pageSize - 1)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('数据库查询错误:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }
    
    const formattedData = (data as any)?.map((job: any) => formatJob(job)) || [];
    
    // ============================================================
    // 安全处理：未登录用户过滤敏感字段
    // ============================================================
    const safeData = isAuthenticated 
      ? formattedData 
      : formattedData.map((job: any) => ({
          id: job.id,
          name: job.name,
          industry: job.industry,
          city: job.city,
          salary: job.salary,
          skills: job.skills?.slice(0, 3) || [], // 只显示前3个技能
          education: job.education,
          experience: job.experience,
          isFreshFriendly: job.isFreshFriendly,
          // 结构化字段（可公开）
          hardSkills: job.hardSkills?.slice(0, 5) || [],
          softSkills: job.softSkills?.slice(0, 3) || [],
          coreDutyModule: job.coreDutyModule || '',
          majorRequire: job.majorRequire || '',
          graduateFriendlyLevel: job.graduateFriendlyLevel || '',
          bonusSkillCert: job.bonusSkillCert || '',
          // 不包含 jdContent、competencyWeights 等详细/敏感字段
        }));
    
    const result = {
      success: true,
      data: safeData,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    };
    
    setCachedResult(cacheKey, result);
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, max-age=120, stale-while-revalidate=300' }
    });
  } catch (error: any) {
    // 安全处理：不暴露错误详情，返回空结果
    console.error('[jobs] 内部错误:', error?.message);
    return NextResponse.json({
      success: true,
      data: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0
    });
  }
}
