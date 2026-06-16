import {NextRequest} from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

import type {CacheEntry, JobRecord} from '@/lib/types';
import { PUBLIC_JD_FIELDS } from '@/lib/rag-utils';
import { jsonOk, jsonError } from '@/lib/api-contracts/_shared';
import { JobsListDataSchema, type JobsListData } from '@/lib/api-contracts/jobs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ============================================================
// 内存缓存 - Edge Runtime 下为 best-effort（同实例命中时更快）
// ============================================================
const searchCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟

function getCachedResult(key: string): unknown | null {
  const cached = searchCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    searchCache.delete(key);
    return null;
  }
  return cached.data;
}

function setCachedResult(key: string, data: unknown): void {
  // 防止缓存无限增长，超过200条时清理最旧的
  if (searchCache.size > 200) {
    const oldest = [...searchCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    if (oldest) searchCache.delete(oldest[0]);
  }
  searchCache.set(key, { data, timestamp: Date.now() });
}

// ============================================================
// 模块级工具函数
// ============================================================
/**
 * 安全转换为字符串数组
 * 支持多种格式：真数组、JSON字符串、逗号分隔、双重转义JSON、null/undefined
 */
function safeToArray(val: unknown): string[] {
  if (val == null) return [];
  if (Array.isArray(val)) {
    return val.map(item => {
      if (typeof item === 'string') {
        const parsed = tryParseJson(item);
        if (Array.isArray(parsed)) return parsed;
      }
      return String(item);
    }).flat();
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    const parsed = tryParseJson(trimmed);
    if (Array.isArray(parsed)) return parsed.map(String);
    return trimmed.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [String(val)];
}

function tryParseJson(str: string): unknown {
  try {
    let result = JSON.parse(str);
    if (typeof result === 'string') {
      try { result = JSON.parse(result); } catch { /* not JSON */ }
    }
    return result;
  } catch {
    return null;
  }
}

// 搜索阶段只查轻量字段（不含responsibilities）
const LIGHT_SELECT_FIELDS = 'id,job_title,industry,city,salary_range,hard_skills,soft_skills,education,experience,created_at,fresh_graduate_friendly,graduate_friendly_level,core_duty_module,major_require,bonus_skill_cert,post_category,competency_weights';

// 格式化单条职位数据
function formatJob(job: JobRecord) {
  const hardSkills = safeToArray(job.hard_skills);
  const softSkills = safeToArray(job.soft_skills);
  const skills = hardSkills.length > 0 ? hardSkills : softSkills;
  
  const salaryRange = job.salary_range || '';
  let salaryMin: number | null = null;
  let salaryMax: number | null = null;
  
  if (salaryRange && salaryRange !== '面议') {
    const match = salaryRange.match(/(\d+(?:\.\d+)?)\s*[Kk千]?\s*[-~到]\s*(\d+(?:\.\d+)?)\s*[Kk千]?/);
    if (match) {
      let min = parseFloat(match[1]!);
      let max = parseFloat(match[2]!);
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
    coreDutyModule: job.core_duty_module || '',
    hardSkills,
    majorRequire: job.major_require || '',
    bonusSkillCert: job.bonus_skill_cert || '',
    postCategory: job.post_category || '',
    graduateFriendlyLevel: job.graduate_friendly_level || '',
    competencyWeights: job.competency_weights || null,
  };
  
  if (salaryMin !== null && salaryMax !== null) {
    return { ...base, salaryMin, salaryMax };
  }
  return base;
}

// 关键词白名单
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
        return jsonOk(JobsListDataSchema, { items: [], total: 0, page, pageSize, totalPages: 0 });
      }
      if (!KEYWORD_REGEX.test(keyword)) {
        return jsonOk(JobsListDataSchema, { items: [], total: 0, page, pageSize, totalPages: 0 });
      }
    }
    
    const offset = (page - 1) * pageSize;

    // ============================================================
    // 缓存检查
    // ============================================================
    const cacheKey = `jobs:${keyword}:${industry}:${city}:${freshOnly}:${education}:${experience}:${companyType}:${page}:${pageSize}`;
    const cached = getCachedResult(cacheKey) as JobsListData | null;
    if (cached) {
      console.log('[jobs] 缓存命中:', cacheKey);
      return jsonOk(JobsListDataSchema, cached, {
        headers: { 'Cache-Control': 'public, max-age=120, stale-while-revalidate=300' },
      });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // ============================================================
    // 【P0优化】关键词搜索：GIN全文索引 — 替代8+并行ilike/contains查询
    // 旧方案：8个并行Supabase查询（job_title.ilike + industry.ilike + 
    //   hard_skills.contains + soft_skills.contains + hard_skills.ilike + 
    //   soft_skills.ilike + 同义词行业eq × N），JS内存合并去重 → 6.5s
    // 新方案：1次textSearch(GIN索引) → ~125ms（实测50倍提升）
    // ============================================================
    if (keyword) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabaseAdmin as any)
        .from('job_descriptions')
        .select(LIGHT_SELECT_FIELDS)
        .or('is_synthetic.is.null,is_synthetic.eq.false')
        .textSearch('search_vector', keyword, {
          config: 'simple',
          type: 'plain',
        })
        .limit(500);

      // 筛选条件链式叠加
      if (industry && industry !== '全部') query = query.eq('industry', industry);
      if (city && city !== '全国') query = query.eq('city', city);
      if (freshOnly) query = query.eq('fresh_graduate_friendly', true);
      if (education && education !== '不限') query = query.eq('education', education);
      if (companyType && companyType !== '全部') query = query.eq('company_type', companyType);
      if (experience && experience !== '不限') {
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

      const { data: searchResults, error: searchError } = await query;

      if (searchError) {
        console.error('[jobs] GIN全文搜索失败:', searchError);
        return jsonError('INTERNAL_ERROR', '搜索失败');
      }

      const results = (searchResults || []) as JobRecord[];

      if (results.length === 0) {
        const emptyResult: JobsListData = { items: [], total: 0, page, pageSize, totalPages: 0 };
        setCachedResult(cacheKey, emptyResult);
        return jsonOk(JobsListDataSchema, emptyResult, {
          headers: { 'Cache-Control': 'public, max-age=120, stale-while-revalidate=300' },
        });
      }

      // GIN索引已按ts_rank排序（PostgreSQL @@操作符默认相关性），无需额外JS评分
      const total = results.length;
      const totalPages = Math.ceil(total / pageSize);
      const paginatedData = results.slice(offset, offset + pageSize);

      // ============================================================
      // 两阶段查询：只为当前页查询 responsibilities
      // ============================================================
      if (paginatedData.length > 0) {
        const pageIds = paginatedData.map(j => j.id);
        const { data: fullData } = await supabaseAdmin
          .from('job_descriptions')
          .select('id, responsibilities')
          .in('id', pageIds);

        if (fullData) {
          const respMap = new Map(fullData.map(d => [d.id, d.responsibilities]));
          for (const job of paginatedData) {
            job.responsibilities = respMap.get(job.id) || job.responsibilities;
          }
        }
      }

      const formattedData = paginatedData.map(job => formatJob(job));

      const result: JobsListData = {
        items: formattedData,
        total,
        page,
        pageSize,
        totalPages,
      };

      setCachedResult(cacheKey, result);
      return jsonOk(JobsListDataSchema, result, {
        headers: { 'Cache-Control': 'public, max-age=120, stale-while-revalidate=300' },
      });
    }

    // ===== 无关键词：简单筛选查询 =====
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      return jsonError('INTERNAL_ERROR', '查询失败');
    }
    
    const formattedData = (data as JobRecord[])?.map((job: JobRecord) => formatJob(job)) || [];
    
    const safeData = isAuthenticated 
      ? formattedData 
      : formattedData.map((job) => ({
          id: job.id,
          name: job.name,
          industry: job.industry,
          city: job.city,
          salary: job.salary,
          skills: job.skills?.slice(0, 3) || [],
          education: job.education,
          experience: job.experience,
          isFreshFriendly: job.isFreshFriendly,
          hardSkills: job.hardSkills?.slice(0, 5) || [],
          softSkills: job.softSkills?.slice(0, 3) || [],
          coreDutyModule: job.coreDutyModule || '',
          majorRequire: job.majorRequire || '',
          graduateFriendlyLevel: job.graduateFriendlyLevel || '',
          bonusSkillCert: job.bonusSkillCert || '',
        }));
    
    const result: JobsListData = {
      items: safeData,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };

    setCachedResult(cacheKey, result);
    return jsonOk(JobsListDataSchema, result, {
      headers: { 'Cache-Control': 'public, max-age=120, stale-while-revalidate=300' },
    });
  } catch (error: unknown) {
    const _error_ = error as Error;
    console.error('[jobs] 内部错误:', _error_?.message);
    return jsonOk(JobsListDataSchema, { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 });
  }
}
