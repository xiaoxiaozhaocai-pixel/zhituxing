/**
 * 岗位百科 · 聚合逻辑（真实 JD 统计，守四真）
 *
 * 数据来源：Supabase job_descriptions 表，只取 is_synthetic=false 的真实 JD。
 * 薪资区间/技能/城市分布均为真实数据的统计结果，不是凭空编写。
 * 字段为 null/空时一律占位"数据待积累"，绝不编造默认值。
 */
import { getSupabaseAdmin } from '@/lib/supabase';
import { PUBLIC_JD_FIELDS } from '@/lib/rag-utils';
import type { JobRecord } from '@/lib/types';

/* ============================================================
 * 类型定义
 * ============================================================ */

export interface CareerSummary {
  slug: string;
  jobTitle: string;
  count: number;
  postCategory?: string;
}

export interface SkillFrequency {
  name: string;
  count: number;
}

export interface SalaryStat {
  range: string;
  count: number;
  min: number;
  max: number;
}

export interface DistributionItem {
  label: string;
  count: number;
}

export interface JobSample {
  id: string;
  company?: string;
  city?: string;
  salaryRange?: string;
  education?: string;
  experience?: string;
  freshGraduateFriendly?: boolean;
}

export interface CareerDetail {
  jobTitle: string;
  slug: string;
  totalCount: number;
  responsibilities: string[];
  coreDutyModules: string[];
  hardSkills: SkillFrequency[];
  softSkills: SkillFrequency[];
  salaryStats: SalaryStat[];
  salarySummary: { min: number; max: number; avg: number } | null;
  cityDistribution: DistributionItem[];
  industryDistribution: DistributionItem[];
  educationDistribution: DistributionItem[];
  experienceDistribution: DistributionItem[];
  freshGraduateStats: { friendly: number; notFriendly: number; total: number };
  graduateFriendlyLevels: DistributionItem[];
  relatedCareers: CareerSummary[];
  sampleJobs: JobSample[];
  sourceNote: string;
}

/* ============================================================
 * Slug 生成
 * ============================================================ */

export function slugifyJobTitle(title: string): string {
  return title
    .replace(/\//g, '-')
    .replace(/\s+/g, '-')
    .replace(/[（）()【】\[\]「」""''：:，,。.!！?？]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/* ============================================================
 * 薪资解析（真实 salary_range 字符串 → min/max 数值）
 * ============================================================ */

function parseSalaryRange(raw: string): { min: number; max: number } | null {
  if (!raw || raw.includes('面议') || raw.includes('另议')) return null;

  const cleaned = raw
    .replace(/·\s*\d+\s*薪/g, '')
    .replace(/以上/g, '')
    .replace(/薪/g, '')
    .trim();

  // 8K-15K / 8k~15k / 8K-15k
  const m1 = cleaned.match(/(\d+(?:\.\d+)?)\s*[kK]\s*[-~到]\s*(\d+(?:\.\d+)?)\s*[kK]?/);
  if (m1) {
    return { min: parseFloat(m1[1]) * 1000, max: parseFloat(m1[2]) * 1000 };
  }

  // 8000-15000 / 8000~15000
  const m2 = cleaned.match(/(\d{4,6})\s*[-~到]\s*(\d{4,6})/);
  if (m2) {
    return { min: parseInt(m2[1], 10), max: parseInt(m2[2], 10) };
  }

  // 8-15K
  const m3 = cleaned.match(/(\d+(?:\.\d+)?)\s*[-~到]\s*(\d+(?:\.\d+)?)\s*[kK]/);
  if (m3) {
    return { min: parseFloat(m3[1]) * 1000, max: parseFloat(m3[2]) * 1000 };
  }

  // 15K (single value)
  const m4 = cleaned.match(/(\d+(?:\.\d+)?)\s*[kK]/);
  if (m4) {
    const v = parseFloat(m4[1]) * 1000;
    return { min: v, max: v };
  }

  return null;
}

function formatSalaryRange(min: number, max: number): string {
  const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(0).replace(/\.0$/, '')}K` : `${n}`);
  return `${fmt(min)}-${fmt(max)}`;
}

/* ============================================================
 * 技能解析（支持 string[] 和 string 两种格式）
 * ============================================================ */

function parseSkills(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((s) => String(s).trim())
      .filter((s) => s && s !== '[]' && s !== 'null');
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed || trimmed === '[]' || trimmed === 'null') return [];
    return trimmed
      .replace(/[\[\]"']/g, '')
      .split(/[,，、;；|]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function aggregateSkills(allSkills: string[][]): SkillFrequency[] {
  const map = new Map<string, number>();
  for (const skills of allSkills) {
    for (const skill of skills) {
      const key = skill.trim();
      if (!key) continue;
      map.set(key, (map.get(key) || 0) + 1);
    }
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

/* ============================================================
 * 通用分布统计
 * ============================================================ */

function aggregateDistribution(
  items: string[],
): DistributionItem[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = (item || '').trim();
    if (!key || key === 'null' || key === 'undefined') continue;
    map.set(key, (map.get(key) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

/* ============================================================
 * 职责文本聚合
 * ============================================================ */

function aggregateResponsibilities(records: JobRecord[]): string[] {
  const allText: string[] = [];
  for (const r of records) {
    const text = r.responsibilities || r.core_duty_module;
    if (!text || typeof text !== 'string') continue;
    const cleaned = text.replace(/[\[\]"']/g, '').trim();
    if (!cleaned || cleaned === 'null') continue;
    // 拆分多句职责
    const parts = cleaned.split(/[；;\n。]/).map((s) => s.trim()).filter(Boolean);
    allText.push(...parts);
  }
  // 去重，保留前 10 条
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const t of allText) {
    const key = t.slice(0, 30);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(t);
    }
    if (unique.length >= 10) break;
  }
  return unique;
}

/* ============================================================
 * 薪资统计聚合
 * ============================================================ */

function aggregateSalary(
  records: JobRecord[],
): { stats: SalaryStat[]; summary: { min: number; max: number; avg: number } | null } {
  const parsed: { min: number; max: number; range: string }[] = [];
  for (const r of records) {
    const parsedSalary = parseSalaryRange(r.salary_range || '');
    if (!parsedSalary) continue;
    parsed.push({
      ...parsedSalary,
      range: r.salary_range || formatSalaryRange(parsedSalary.min, parsedSalary.max),
    });
  }

  if (parsed.length === 0) {
    return { stats: [], summary: null };
  }

  // 按区间分组统计
  const buckets = new Map<string, { count: number; min: number; max: number }>();
  for (const p of parsed) {
    const key = formatSalaryRange(p.min, p.max);
    const existing = buckets.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      buckets.set(key, { count: 1, min: p.min, max: p.max });
    }
  }

  const stats = Array.from(buckets.entries())
    .map(([range, v]) => ({ range, count: v.count, min: v.min, max: v.max }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const allMins = parsed.map((p) => p.min);
  const allMaxs = parsed.map((p) => p.max);
  const overallMin = Math.min(...allMins);
  const overallMax = Math.max(...allMaxs);
  const avg = Math.round(
    parsed.reduce((s, p) => s + (p.min + p.max) / 2, 0) / parsed.length,
  );

  return {
    stats,
    summary: { min: overallMin, max: overallMax, avg },
  };
}

/* ============================================================
 * 核心查询函数
 * ============================================================ */

/**
 * 获取岗位百科列表（用于 sitemap 与索引页）
 * 按 job_title 聚合，返回高频岗位 slug 列表
 */
export async function getCareerList(limit = 100): Promise<CareerSummary[]> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('job_descriptions')
      .select('job_title, post_category')
      .eq('is_synthetic', false);
    if (error || !data || data.length === 0) return [];

    // 在内存中按 job_title 聚合
    const map = new Map<string, { count: number; postCategory?: string }>();
    for (const row of data as unknown as JobRecord[]) {
      const title = (row.job_title || '').trim();
      if (!title) continue;
      const existing = map.get(title);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(title, { count: 1, postCategory: row.post_category });
      }
    }

    return Array.from(map.entries())
      .map(([jobTitle, v]) => ({
        slug: slugifyJobTitle(jobTitle),
        jobTitle,
        count: v.count,
        postCategory: v.postCategory,
      }))
      .filter((c) => c.slug)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  } catch {
    return [];
  }
}

/**
 * 获取岗位百科详情（聚合统计）
 */
export async function getCareerDetail(slug: string): Promise<CareerDetail | null> {
  try {
    const supabase = getSupabaseAdmin();

    // 第一步：查询所有 distinct job_title，找到 slug 对应的真实 job_title
    const { data: titleRows, error: titleError } = await supabase
      .from('job_descriptions')
      .select('job_title')
      .eq('is_synthetic', false);

    if (titleError || !titleRows || titleRows.length === 0) return null;

    // 找到 slug 匹配的 job_title
    const matchedTitle = (titleRows as unknown as JobRecord[]).find(
      (r) => slugifyJobTitle(r.job_title || '') === slug,
    );
    if (!matchedTitle || !matchedTitle.job_title) return null;

    const jobTitle = matchedTitle.job_title;

    // 第二步：查询该岗位的所有真实 JD 记录
    const { data: records, error: recError } = await supabase
      .from('job_descriptions')
      .select(PUBLIC_JD_FIELDS)
      .eq('is_synthetic', false)
      .eq('job_title', jobTitle);

    if (recError || !records || records.length === 0) return null;

    const jobs = records as unknown as JobRecord[];

    // 聚合统计
    const hardSkills = aggregateSkills(jobs.map((r) => parseSkills(r.hard_skills)));
    const softSkills = aggregateSkills(jobs.map((r) => parseSkills(r.soft_skills)));
    const { stats: salaryStats, summary: salarySummary } = aggregateSalary(jobs);
    const cityDistribution = aggregateDistribution(
      jobs.map((r) => r.city || '').filter(Boolean),
    );
    const industryDistribution = aggregateDistribution(
      jobs.map((r) => r.industry || '').filter(Boolean),
    );
    const educationDistribution = aggregateDistribution(
      jobs.map((r) => r.education || '').filter(Boolean),
    );
    const experienceDistribution = aggregateDistribution(
      jobs.map((r) => r.experience || '').filter(Boolean),
    );
    const responsibilities = aggregateResponsibilities(jobs);
    const coreDutyModules = aggregateDistribution(
      jobs.map((r) => (r.core_duty_module as string) || '').filter(Boolean),
    );

    const freshFriendly = jobs.filter((r) => r.fresh_graduate_friendly === true).length;
    const graduateFriendlyLevels = aggregateDistribution(
      jobs.map((r) => r.graduate_friendly_level || '').filter(Boolean),
    );

    // 相关岗位：同 post_category
    const postCategory = jobs[0]?.post_category;
    let relatedCareers: CareerSummary[] = [];
    if (postCategory) {
      const { data: relatedRows } = await supabase
        .from('job_descriptions')
        .select('job_title')
        .eq('is_synthetic', false)
        .eq('post_category', postCategory)
        .neq('job_title', jobTitle)
        .limit(200);
      if (relatedRows && relatedRows.length > 0) {
        const relatedMap = new Map<string, number>();
        for (const row of relatedRows as unknown as JobRecord[]) {
          const title = (row.job_title || '').trim();
          if (!title) continue;
          relatedMap.set(title, (relatedMap.get(title) || 0) + 1);
        }
        relatedCareers = Array.from(relatedMap.entries())
          .map(([title, count]) => ({
            slug: slugifyJobTitle(title),
            jobTitle: title,
            count,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6);
      }
    }

    // 样本岗位
    const sampleJobs: JobSample[] = jobs.slice(0, 6).map((r) => ({
      id: String(r.id),
      company: r.company,
      city: r.city,
      salaryRange: r.salary_range,
      education: r.education,
      experience: r.experience,
      freshGraduateFriendly: r.fresh_graduate_friendly,
    }));

    return {
      jobTitle,
      slug,
      totalCount: jobs.length,
      responsibilities,
      coreDutyModules: coreDutyModules.map((d) => d.label),
      hardSkills: hardSkills.slice(0, 20),
      softSkills: softSkills.slice(0, 15),
      salaryStats,
      salarySummary,
      cityDistribution: cityDistribution.slice(0, 10),
      industryDistribution: industryDistribution.slice(0, 10),
      educationDistribution,
      experienceDistribution,
      freshGraduateStats: {
        friendly: freshFriendly,
        notFriendly: jobs.length - freshFriendly,
        total: jobs.length,
      },
      graduateFriendlyLevels,
      relatedCareers,
      sampleJobs,
      sourceNote: `数据来源：职途星岗位数据库（job_descriptions 表，is_synthetic=false），共 ${jobs.length} 条真实 JD 统计`,
    };
  } catch {
    return null;
  }
}

/**
 * 获取学校关联岗位（按城市 + 强势专业匹配）
 */
export async function getSchoolRelatedJobs(
  city: string,
  majorKeywords: string[],
  limit = 12,
): Promise<JobSample[]> {
  try {
    const supabase = getSupabaseAdmin();

    // 优先按城市匹配
    let query = supabase
      .from('job_descriptions')
      .select(PUBLIC_JD_FIELDS)
      .eq('is_synthetic', false);

    if (city) {
      query = query.ilike('city', `%${city}%`);
    }

    const { data: cityJobs, error: cityError } = await query.limit(limit * 2);

    if (!cityError && cityJobs && cityJobs.length > 0) {
      const jobs = cityJobs as unknown as JobRecord[];
      return jobs.slice(0, limit).map((r) => ({
        id: String(r.id),
        company: r.company,
        city: r.city,
        salaryRange: r.salary_range,
        education: r.education,
        experience: r.experience,
        freshGraduateFriendly: r.fresh_graduate_friendly,
      }));
    }

    // 城市匹配不足，按强势专业 major_require 匹配
    if (majorKeywords.length > 0) {
      const orFilter = majorKeywords
        .map((kw) => `major_require.ilike.%${kw}%`)
        .join(',');
      const { data: majorJobs } = await supabase
        .from('job_descriptions')
        .select(PUBLIC_JD_FIELDS)
        .eq('is_synthetic', false)
        .or(orFilter)
        .limit(limit * 2);

      if (majorJobs && majorJobs.length > 0) {
        const jobs = majorJobs as unknown as JobRecord[];
        return jobs.slice(0, limit).map((r) => ({
          id: String(r.id),
          company: r.company,
          city: r.city,
          salaryRange: r.salary_range,
          education: r.education,
          experience: r.experience,
          freshGraduateFriendly: r.fresh_graduate_friendly,
        }));
      }
    }

    return [];
  } catch {
    return [];
  }
}

/**
 * 获取学校关联岗位的分布统计
 */
export function aggregateJobDistribution(
  jobs: { city?: string; industry?: string }[],
): { cityDistribution: DistributionItem[]; industryDistribution: DistributionItem[] } {
  return {
    cityDistribution: aggregateDistribution(jobs.map((j) => j.city || '').filter(Boolean)),
    industryDistribution: aggregateDistribution(jobs.map((j) => j.industry || '').filter(Boolean)),
  };
}
