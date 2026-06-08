/**
 * 匹配服务 — P1 匹配层核心
 * 
 * 取代旧 GET/POST /api/match 的虚假打分，接入：
 * 1. pgvector 语义搜索（DeepSeek Embedding）
 * 2. matching-algorithm.ts 真实多维度打分
 * 3. 多维加权（技能35%+学历15%+专业15%+地点15%+经验10%+薪资10%）
 */

import { getSupabaseAdmin } from '@/lib/supabase';
import { getEmbedding } from '@/lib/embedding';
import {
  calculateSkillMatch,
  estimateSalaryRange,
  parseJobSkills,
  extractUserSkillsFromAbilityBackground,
  parseUserSkillsFromText,
  parseSalaryRange,
  type UserSkill
} from '@/lib/matching-algorithm';

// ============================================================
// 类型定义
// ============================================================

export interface MatchResult {
  /** 岗位ID */
  jobId: number | string;
  /** 岗位名称 */
  jobTitle: string;
  /** 综合匹配度 0-100 */
  totalScore: number;
  /** 各维度得分 */
  dimensions: {
    skillScore: number;       // 技能匹配 35%
    educationScore: number;   // 学历匹配 15%
    majorScore: number;       // 专业对口 15%
    locationScore: number;    // 地点偏好 15%
    experienceScore: number;  // 经验要求 10%
    salaryScore: number;      // 薪资匹配 10%
  };
  /** 技能缺口 */
  skillGaps: string[];
  /** 薪资估算 */
  salaryEstimation?: {
    estimatedMin: number;
    estimatedMax: number;
    estimatedMedian: number;
  };
  /** 岗位基本信息 */
  jobMeta: {
    industry?: string;
    city?: string;
    salaryRange?: string;
    education?: string;
    experience?: string;
  };
}

export interface MatchRequest {
  userId: string;
  /** 自然语言描述或空格分隔的技能 */
  skills?: string;
  /** 目标岗位（可选，用于薪资估算） */
  targetPosition?: string;
  /** 意向行业 */
  industry?: string;
  /** 意向城市 */
  city?: string;
  /** 期望薪资 */
  expectedSalary?: string;
  /** 返回数量 */
  limit?: number;
}

// ============================================================
// 权重配置（同方案文档 5.3）
// ============================================================

const WEIGHTS = {
  skill: 0.35,
  education: 0.15,
  major: 0.15,
  location: 0.15,
  experience: 0.10,
  salary: 0.10,
};

// ============================================================
// 主入口：执行完整匹配流程
// ============================================================

export async function matchJobs(request: MatchRequest): Promise<MatchResult[]> {
  const { userId, skills, targetPosition, industry, city, expectedSalary, limit = 10 } = request;

  // 1. 获取用户画像（技能+学历+专业+城市偏好）
  const userProfile = await getUserProfile(userId);
  const userSkills = getUserSkills(userId, skills, userProfile);

  // 2. pgvector 语义搜索 → 召回候选 JD
  const searchText = buildSearchText(skills, targetPosition, industry, city);
  const candidates = await semanticSearch(searchText, limit * 3, industry, city);

  if (candidates.length === 0) {
    return [];
  }

  // 3. 多维打分
  const scored = candidates.map(jd => scoreJob(jd, userSkills, userProfile, expectedSalary));

  // 4. 按总分降序 + 截取
  scored.sort((a, b) => b.totalScore - a.totalScore);
  return scored.slice(0, limit);
}

// ============================================================
// 1. 用户画像获取
// ============================================================

interface UserProfile {
  education?: string;      // 学历层次
  major?: string;          // 专业
  preferredCity?: string;  // 意向城市
  grade?: string;          // 年级
  abilityBackground?: Record<string, unknown>;
  skillsText?: string;
}

async function getUserProfile(userId: string): Promise<UserProfile> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('user_profiles')
    .select('education, major, preferred_city, grade, ability_background, skills')
    .eq('id', userId)
    .single();

  if (!data) return {};

  return {
    education: data.education || undefined,
    major: data.major || undefined,
    preferredCity: data.preferred_city || undefined,
    grade: data.grade || undefined,
    abilityBackground: data.ability_background as Record<string, unknown> | undefined,
    skillsText: data.skills || undefined,
  };
}

function getUserSkills(
  userId: string,
  inputSkills?: string,
  profile?: UserProfile
): UserSkill[] {
  // 优先使用用户输入
  if (inputSkills) {
    return parseUserSkillsFromText(inputSkills);
  }

  // 其次使用用户画像
  if (profile) {
    const fromBg = extractUserSkillsFromAbilityBackground(profile.abilityBackground);
    if (fromBg.length > 0) return fromBg;

    const fromText = parseUserSkillsFromText(profile.skillsText);
    if (fromText.length > 0) return fromText;
  }

  return [];
}

// ============================================================
// 2. pgvector 语义搜索
// ============================================================

function buildSearchText(
  skills?: string,
  targetPosition?: string,
  industry?: string,
  city?: string
): string {
  const parts: string[] = [];
  if (targetPosition) parts.push(`岗位：${targetPosition}`);
  if (skills) parts.push(`技能：${skills}`);
  if (industry) parts.push(`行业：${industry}`);
  if (city) parts.push(`城市：${city}`);
  return parts.join('\n') || '实习岗位';
}

async function semanticSearch(
  searchText: string,
  limit: number,
  industry?: string,
  city?: string
): Promise<Array<Record<string, unknown>>> {
  const supabase = getSupabaseAdmin();

  // 生成搜索文本的 embedding
  const embedding = await getEmbedding(searchText);

  if (!embedding || embedding.length === 0) {
    // 降级：关键词搜索
    console.warn('[matching] Embedding failed, falling back to keyword search');
    return keywordFallback(limit, industry, city);
  }

  // pgvector 余弦相似度搜索
  // 距离越小 → 相似度越高 → 转为 score（1 - 距离）
  const { data, error } = await supabase.rpc('match_jobs', {
    query_embedding: embedding,
    match_limit: limit,
    industry_filter: industry || null,
    city_filter: city || null,
  });

  if (error) {
    console.error('[matching] Vector search error:', error.message);
    return keywordFallback(limit, industry, city);
  }

  return (data || []) as Array<Record<string, unknown>>;
}

/** 关键词降级搜索（embedding 不可用时） */
async function keywordFallback(
  limit: number,
  industry?: string,
  city?: string
): Promise<Array<Record<string, unknown>>> {
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from('job_descriptions')
    .select('id, job_title, industry, city, salary_range, education, experience, responsibilities, hard_skills, soft_skills, major_require')
    .eq('status', 'parsed')
    .limit(limit);

  if (industry) {
    query = query.ilike('industry', `%${industry}%`);
  }
  if (city) {
    query = query.ilike('city', `%${city}%`);
  }

  const { data } = await query;
  return (data || []) as Array<Record<string, unknown>>;
}

// ============================================================
// 3. 多维打分引擎
// ============================================================

/** 从 JD 的 jsonb 技能列构建技能字符串 */
function buildJDSkillsString(jd: Record<string, unknown>): string {
  const parts: string[] = [];
  const hardSkills = jd.hard_skills;
  const softSkills = jd.soft_skills;
  if (Array.isArray(hardSkills)) parts.push(hardSkills.join(", "));
  else if (typeof hardSkills === "string") parts.push(hardSkills);
  if (Array.isArray(softSkills)) parts.push(softSkills.join(", "));
  else if (typeof softSkills === "string") parts.push(softSkills);
  if (jd.major_require) parts.push(String(jd.major_require));
  return parts.join(", ");
}

function scoreJob(
  jd: Record<string, unknown>,
  userSkills: UserSkill[],
  profile: UserProfile,
  expectedSalary?: string
): MatchResult {
  // 解析 JD 技能要求
  const jdSkillsStr = buildJDSkillsString(jd);
  const jdSkills = parseJobSkills(jdSkillsStr);

  // 3a. 技能匹配 (35%)
  const skillResult = calculateSkillMatch(userSkills, jdSkills, { weighted: true });
  const skillScore = skillResult.weightedScore ?? skillResult.matchScore;

  // 3b. 学历匹配 (15%)
  const educationScore = matchEducation(profile.education, jd.education as string);

  // 3c. 专业对口 (15%)
  const majorScore = matchMajor(profile.major, jd.job_title as string, jd.industry as string);

  // 3d. 地点偏好 (15%)
  const locationScore = matchLocation(profile.preferredCity, jd.city as string);

  // 3e. 经验要求 (10%)
  const experienceScore = matchExperience(profile.grade, jd.experience as string);

  // 3f. 薪资匹配 (10%)
  const salaryScore = matchSalary(expectedSalary, jd.salary_range as string);

  // 综合加权
  const totalScore = Math.round(
    skillScore * WEIGHTS.skill +
    educationScore * WEIGHTS.education +
    majorScore * WEIGHTS.major +
    locationScore * WEIGHTS.location +
    experienceScore * WEIGHTS.experience +
    salaryScore * WEIGHTS.salary
  );

  // 薪资估算
  const salaryEstimation = (() => {
    const parsed = parseSalaryRange(jd.salary_range as string);
    if (!parsed) return undefined;
    return estimateSalaryRange(totalScore, parsed.min, parsed.max);
  })();

  return {
    jobId: jd.id as string | number,
    jobTitle: (jd.job_title as string) || '未知岗位',
    totalScore,
    dimensions: {
      skillScore,
      educationScore,
      majorScore,
      locationScore,
      experienceScore,
      salaryScore,
    },
    skillGaps: skillResult.gapSkills,
    salaryEstimation: salaryEstimation ? {
      estimatedMin: salaryEstimation.estimatedSalaryMin,
      estimatedMax: salaryEstimation.estimatedSalaryMax,
      estimatedMedian: salaryEstimation.estimatedSalaryMedian,
    } : undefined,
    jobMeta: {
      industry: jd.industry as string,
      city: jd.city as string,
      salaryRange: jd.salary_range as string,
      education: jd.education as string,
      experience: jd.experience as string,
    },
  };
}

// ============================================================
// 各维度匹配函数
// ============================================================

/** 学历匹配：层次对比 */
function matchEducation(userEdu?: string, jdEdu?: string): number {
  if (!userEdu || !jdEdu) return 60; // 缺信息默认及格
  const levels: Record<string, number> = {
    '高中': 1, '中专': 2, '大专': 3, '本科': 4, '硕士': 5, '博士': 6,
    '不限': 0,
  };
  const userLevel = levels[userEdu] || 3;
  const jdLevel = levels[jdEdu] || 0;
  if (jdLevel === 0) return 100; // 不限学历 = 满分
  if (userLevel >= jdLevel) return 100;
  // 差一级扣 30 分
  return Math.max(0, 100 - (jdLevel - userLevel) * 30);
}

/** 专业对口：JD标题关键词匹配 */
function matchMajor(userMajor?: string, jobTitle?: string, industry?: string): number {
  if (!userMajor) return 50;
  const searchText = `${jobTitle || ''} ${industry || ''}`.toLowerCase();
  const major = userMajor.toLowerCase();

  // 直接包含
  if (searchText.includes(major)) return 100;

  // 专业关键词映射
  const majorKeywords: Record<string, string[]> = {
    '人力资源管理': ['hr', '人事', '招聘', '人力资源', '行政'],
    '计算机': ['开发', '工程师', 'java', 'python', '前端', '后端', '运维'],
    '会计': ['财务', '审计', '税务', '会计'],
    '市场营销': ['运营', '市场', '销售', '营销', '推广', '新媒体'],
    '英语': ['翻译', '外贸', '英语', '海外'],
    '机械': ['制造', '机械', '设计', '工艺'],
  };

  const keywords = majorKeywords[major] || [];
  for (const kw of keywords) {
    if (searchText.includes(kw)) return 80;
  }

  return 40; // 不相关
}

/** 地点匹配 */
function matchLocation(userCity?: string, jdCity?: string): number {
  if (!userCity || !jdCity) return 60;
  if (jdCity.includes(userCity) || userCity.includes(jdCity)) return 100;
  // 同省份（简单判断：取前两个字）
  if (userCity.slice(0, 2) === jdCity.slice(0, 2)) return 80;
  return 30;
}

/** 经验匹配：年级 → 经验要求 */
function matchExperience(userGrade?: string, jdExp?: string): number {
  if (!userGrade || !jdExp) return 60;
  // 大三/大四 → 实习/应届
  const isJuniorSenior = userGrade.includes('三') || userGrade.includes('四');
  const jdExpLower = jdExp.toLowerCase();

  if (isJuniorSenior && (jdExpLower.includes('实习') || jdExpLower.includes('应届') || jdExpLower.includes('不限'))) {
    return 100;
  }
  if (jdExpLower.includes('不限')) return 100;
  if (jdExpLower.includes('1年') && isJuniorSenior) return 70;
  if (jdExpLower.includes('3年')) return isJuniorSenior ? 20 : 60;

  return 50;
}

/** 薪资匹配 */
function matchSalary(expectedSalary?: string, jdSalary?: string): number {
  if (!expectedSalary || !jdSalary) return 60;
  const parsedExpected = parseSalaryRange(expectedSalary);
  const parsedJd = parseSalaryRange(jdSalary);
  if (!parsedExpected || !parsedJd) return 60;

  // 期望薪资在 JD 范围内的百分比
  const userMid = (parsedExpected.min + parsedExpected.max) / 2;
  const jdMin = parsedJd.min;
  const jdMax = parsedJd.max;

  if (userMid >= jdMin && userMid <= jdMax) return 100;
  if (userMid < jdMin) {
    // 期望低于JD下限，距离越大分越低
    const gap = (jdMin - userMid) / jdMin;
    return Math.max(30, Math.round(100 - gap * 70));
  }
  // 期望高于JD上限
  const gap = (userMid - jdMax) / jdMax;
  return Math.max(30, Math.round(100 - gap * 70));
}
