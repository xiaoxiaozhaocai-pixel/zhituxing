/**
 * 职途星 — 匹配算法模块
 *
 * 4个核心函数：
 * 1. calculateSkillMatch          — 技能匹配度计算
 * 2. analyzeSkillGaps             — 技能缺口分析（基于前置关系生成学习路径）
 * 3. estimateSalaryRange          — 薪资范围估算（匹配度插值）
 * 4. calculateCompetencyPercentile — 竞争力百分位
 *
 * 设计原则：
 * - 纯函数，不直接操作数据库，由 API Route 层查库后传入结构化数据
 * - 所有函数均为同步计算，无异步副作用
 * - 兼容现有表结构（jobs.skills 逗号分隔字符串、user_profiles.ability_background jsonb）
 */

// ============================================================
// 类型定义
// ============================================================

/** 用户技能条目 */
export interface UserSkill {
  name: string;
  /** 掌握等级 1-5 */
  level?: number;
  /** 掌握程度描述：入门/基础/熟练/精通 */
  proficiency?: string;
}

/** 岗位技能要求 */
export interface JobSkillRequirement {
  name: string;
  /** 是否为必须技能（非必须技能匹配权重更低） */
  required?: boolean;
  /** 期望掌握等级 1-5 */
  expectedLevel?: number;
}

/** 岗位JD信息 */
export interface JobDescription {
  id: number | string;
  jobName: string;
  skills: JobSkillRequirement[];
  salaryMin?: number;
  salaryMax?: number;
  salaryRange?: string;
  city?: string;
  industry?: string;
}

/** 技能关系（对应 skill_relations 表） */
export interface SkillRelation {
  sourceSkill: string;
  targetSkill: string;
  /** co_occur | prerequisite | similar | career_path */
  relationType: 'co_occur' | 'prerequisite' | 'similar' | 'career_path';
  /** 关系权重 0-1 */
  weight?: number;
}

/** 其他用户匹配度（用于百分位计算） */
export interface PeerMatchScore {
  userId: string | number;
  matchScore: number;
}

// ============================================================
// 1. 技能匹配度计算
// ============================================================

export interface SkillMatchResult {
  /** 匹配度 0-100 */
  matchScore: number;
  /** 已匹配的技能列表 */
  matchedSkills: string[];
  /** 缺口技能列表 */
  gapSkills: string[];
  /** 必须技能匹配详情 */
  requiredMatched: string[];
  /** 必须技能缺口 */
  requiredGaps: string[];
  /** 加权匹配度（考虑技能等级） */
  weightedScore?: number;
}

/**
 * 计算用户技能与岗位的匹配度
 *
 * 核心公式：
 *   matchScore = (已匹配技能数 / 岗位要求技能数) × 100
 *
 * 加权模式（当用户技能含 level 时）：
 *   weightedScore = Σ(每项匹配的等级得分) / Σ(岗位要求等级) × 100
 *
 * @param userSkills  - 用户技能列表
 * @param jobSkills   - 岗位要求技能列表
 * @param options     - 可选配置
 */
export function calculateSkillMatch(
  userSkills: UserSkill[],
  jobSkills: JobSkillRequirement[],
  options?: {
    /** 是否启用加权计算（需用户技能含 level） */
    weighted?: boolean;
    /** 模糊匹配阈值 0-1，技能名称相似度超过此值视为匹配（默认 0.8） */
    fuzzyThreshold?: number;
  }
): SkillMatchResult {
  const { weighted = false, fuzzyThreshold = 0.8 } = options ?? {};

  if (jobSkills.length === 0) {
    return {
      matchScore: 100,
      matchedSkills: [],
      gapSkills: [],
      requiredMatched: [],
      requiredGaps: [],
      weightedScore: weighted ? 100 : undefined,
    };
  }

  // 构建用户技能名查找表（统一小写）
  const userSkillMap = new Map<string, UserSkill>();
  for (const skill of userSkills) {
    userSkillMap.set(normalizeSkillName(skill.name), skill);
  }

  const matchedSkills: string[] = [];
  const gapSkills: string[] = [];
  const requiredMatched: string[] = [];
  const requiredGaps: string[] = [];

  let weightedNumerator = 0;
  let weightedDenominator = 0;

  for (const req of jobSkills) {
    const normalizedReq = normalizeSkillName(req.name);
    const matched = findMatchingSkill(normalizedReq, userSkillMap, fuzzyThreshold);

    if (matched) {
      matchedSkills.push(req.name);

      if (req.required !== false) {
        requiredMatched.push(req.name);
      }

      // 加权计算
      if (weighted && req.expectedLevel && matched.level) {
        const contribution = Math.min(matched.level, req.expectedLevel);
        weightedNumerator += contribution;
        weightedDenominator += req.expectedLevel;
      } else if (weighted) {
        // 无等级信息时，匹配项默认满分
        weightedNumerator += req.expectedLevel || 3;
        weightedDenominator += req.expectedLevel || 3;
      }
    } else {
      gapSkills.push(req.name);

      if (req.required !== false) {
        requiredGaps.push(req.name);
      }

      if (weighted) {
        weightedDenominator += req.expectedLevel || 3;
      }
    }
  }

  // sqrt 平滑：避免少量匹配时分数过低（如 2/7 → 53 而非 29）
  const ratio = matchedSkills.length / jobSkills.length;
  const smoothedRatio = Math.sqrt(ratio);
  const matchScore = Math.round(smoothedRatio * 100);

  const weightedScore =
    weighted && weightedDenominator > 0
      ? Math.round(Math.sqrt(weightedNumerator / weightedDenominator) * 100)
      : undefined;

  return {
    matchScore,
    matchedSkills,
    gapSkills,
    requiredMatched,
    requiredGaps,
    weightedScore,
  };
}

// ============================================================
// 2. 技能缺口分析
// ============================================================

/** 学习路径阶段 */
export interface LearningPhase {
  /** 阶段名称 */
  phase: string;
  /** 该阶段需学习的技能（按依赖顺序排列） */
  skills: string[];
  /** 预计学习时长（天） */
  estimatedDays?: number;
}

export interface SkillGapAnalysisResult {
  /** 原始缺口技能列表 */
  gapSkills: string[];
  /** 按前置依赖排序的学习路径 */
  learningPath: LearningPhase[];
  /** 每个缺口技能的前置技能链 */
  prerequisiteChains: Record<string, string[]>;
}

/**
 * 分析技能缺口，基于前置关系生成学习路径
 *
 * 算法：
 * 1. 对每个缺口技能，沿 prerequisite 关系向上溯源，构建依赖链
 * 2. 按依赖深度分组（同一深度的技能可并行学习）
 * 3. 已掌握的技能从路径中排除，避免重复
 *
 * @param gapSkills      - 缺口技能名称列表
 * @param skillRelations - 技能关系数据（来自 skill_relations 表）
 * @param knownSkills    - 用户已掌握的技能名称（用于排除路径中已掌握的节点）
 */
export function analyzeSkillGaps(
  gapSkills: string[],
  skillRelations: SkillRelation[],
  knownSkills: string[] = []
): SkillGapAnalysisResult {
  const knownSet = new Set(knownSkills.map(normalizeSkillName));

  // 仅提取 prerequisite 关系，构建邻接表：target → [source, ...]
  // 含义：要学 target，需先掌握 source
  const prerequisiteMap = new Map<string, string[]>();
  for (const rel of skillRelations) {
    if (rel.relationType === 'prerequisite') {
      const target = normalizeSkillName(rel.targetSkill);
      const source = normalizeSkillName(rel.sourceSkill);
      const existing = prerequisiteMap.get(target) || [];
      existing.push(source);
      prerequisiteMap.set(target, existing);
    }
  }

  // 对每个缺口技能，递归溯源前置链
  const prerequisiteChains: Record<string, string[]> = {};

  function tracePrerequisites(skill: string, visited: Set<string>): string[] {
    const normalized = normalizeSkillName(skill);
    if (visited.has(normalized)) return []; // 防环
    visited.add(normalized);

    const prereqs = prerequisiteMap.get(normalized) || [];
    const chain: string[] = [];

    for (const prereq of prereqs) {
      // 跳过已掌握的技能
      if (knownSet.has(normalizeSkillName(prereq))) continue;
      const subChain = tracePrerequisites(prereq, visited);
      chain.push(...subChain, prereq);
    }

    return chain;
  }

  // 收集所有需要学习的技能及其深度
  const skillDepthMap = new Map<string, number>();

  function computeDepth(skill: string, visited: Set<string>): number {
    const normalized = normalizeSkillName(skill);
    if (visited.has(normalized)) return skillDepthMap.get(normalized) || 0;
    visited.add(normalized);

    const prereqs = prerequisiteMap.get(normalized) || [];
    if (prereqs.length === 0) {
      skillDepthMap.set(normalized, 0);
      return 0;
    }

    let maxDepth = 0;
    for (const prereq of prereqs) {
      if (knownSet.has(normalizeSkillName(prereq))) continue;
      const depth = computeDepth(prereq, visited);
      maxDepth = Math.max(maxDepth, depth);
    }

    const depth = maxDepth + 1;
    skillDepthMap.set(normalized, depth);
    return depth;
  }

  for (const gap of gapSkills) {
    const normalizedGap = normalizeSkillName(gap);
    if (knownSet.has(normalizedGap)) continue;

    const chain = tracePrerequisites(gap, new Set());
    prerequisiteChains[gap] = [...new Set(chain)];

    computeDepth(gap, new Set());
  }

  // 按深度分组，构建学习路径
  const depthGroups = new Map<number, string[]>();
  for (const [skill, depth] of skillDepthMap.entries()) {
    const group = depthGroups.get(depth) || [];
    group.push(skill);
    depthGroups.set(depth, group);
  }

  const sortedDepths = [...depthGroups.keys()].sort((a, b) => a - b);
  const learningPath: LearningPhase[] = [];

  sortedDepths.forEach((depth, index) => {
    const skills = depthGroups.get(depth) || [];
    learningPath.push({
      phase: `第${index + 1}阶段`,
      skills,
      estimatedDays: estimatePhaseDuration(skills.length),
    });
  });

  // 如果学习路径为空但存在缺口技能（无前置关系），直接放入第1阶段
  if (learningPath.length === 0 && gapSkills.length > 0) {
    const filteredGaps = gapSkills.filter(
      (g) => !knownSet.has(normalizeSkillName(g))
    );
    if (filteredGaps.length > 0) {
      learningPath.push({
        phase: '第1阶段',
        skills: filteredGaps,
        estimatedDays: estimatePhaseDuration(filteredGaps.length),
      });
    }
  }

  return {
    gapSkills,
    learningPath,
    prerequisiteChains,
  };
}

// ============================================================
// 3. 薪资范围估算
// ============================================================

export interface SalaryEstimationResult {
  /** 估算薪资下限（元/月） */
  estimatedSalaryMin: number;
  /** 估算薪资上限（元/月） */
  estimatedSalaryMax: number;
  /** 估算中位薪资 */
  estimatedSalaryMedian: number;
  /** 匹配度 0-100 */
  matchScore: number;
  /** 原始岗位薪资范围 */
  originalSalaryMin?: number;
  originalSalaryMax?: number;
}

/**
 * 根据匹配度估算薪资范围
 *
 * 算法：线性插值
 *   - 匹配度 100% → 薪资上限（salaryMax）
 *   - 匹配度   0% → 薪资下限的 60%（保底线）
 *   - 中间值按比例插值
 *
 * 公式：
 *   estimatedMin = salaryMin + (salaryMax - salaryMin) × (matchScore / 100) × 0.6
 *   estimatedMax = salaryMin + (salaryMax - salaryMin) × (matchScore / 100)
 *
 * @param matchScore  - 技能匹配度 0-100
 * @param salaryMin   - 岗位薪资范围下限（元/月）
 * @param salaryMax   - 岗位薪资范围上限（元/月）
 */
export function estimateSalaryRange(
  matchScore: number,
  salaryMin: number,
  salaryMax: number
): SalaryEstimationResult {
  // 边界保护
  const score = Math.max(0, Math.min(100, matchScore));
  const sMin = Math.max(0, salaryMin);
  const sMax = Math.max(sMin, salaryMax);

  const ratio = score / 100;
  const range = sMax - sMin;

  // 匹配度越高，薪资越接近上限；最低不低于下限的60%
  const floorRatio = 0.6;
  const estimatedSalaryMin = Math.round(
    sMin * floorRatio + range * ratio * floorRatio
  );
  const estimatedSalaryMax = Math.round(sMin + range * ratio);
  const estimatedSalaryMedian = Math.round(
    (estimatedSalaryMin + estimatedSalaryMax) / 2
  );

  return {
    estimatedSalaryMin,
    estimatedSalaryMax,
    estimatedSalaryMedian,
    matchScore: score,
    originalSalaryMin: sMin,
    originalSalaryMax: sMax,
  };
}

/**
 * 从薪资范围字符串解析出上下限数字
 * 支持格式："8k-12k"、"8000-12000"、"8K-12K/月"、"6-10K" 等
 */

/**
 * 行业+岗位默认薪资估算（月薪/元）
 * 当 JD 薪资为"面议"时使用，基于行业和岗位关键字推断
 */
const INDUSTRY_DEFAULTS: Record<string, { min: number; max: number }> = {
  '互联网': { min: 10000, max: 25000 },
  'IT': { min: 10000, max: 25000 },
  '软件': { min: 10000, max: 25000 },
  '金融': { min: 8000, max: 20000 },
  '银行': { min: 8000, max: 20000 },
  '通信': { min: 8000, max: 18000 },
  '硬件': { min: 8000, max: 18000 },
  '电子': { min: 8000, max: 18000 },
  '半导体': { min: 10000, max: 25000 },
  '人工智能': { min: 12000, max: 30000 },
  '医疗': { min: 7000, max: 18000 },
  '制药': { min: 7000, max: 18000 },
  '教育': { min: 5000, max: 12000 },
  '培训': { min: 5000, max: 12000 },
  '制造': { min: 6000, max: 15000 },
  '汽车': { min: 7000, max: 18000 },
  '房地产': { min: 6000, max: 15000 },
  '建筑': { min: 6000, max: 15000 },
  '零售': { min: 5000, max: 10000 },
  '电商': { min: 6000, max: 18000 },
  '物流': { min: 5000, max: 12000 },
  '能源': { min: 7000, max: 18000 },
  '媒体': { min: 5000, max: 12000 },
  '广告': { min: 5000, max: 12000 },
  '咨询': { min: 7000, max: 18000 },
  '财务': { min: 6000, max: 15000 },
  '会计': { min: 5000, max: 12000 },
  '传媒': { min: 5000, max: 15000 },
  '市场营销': { min: 6000, max: 15000 },
  '设计': { min: 6000, max: 18000 },
  '游戏': { min: 8000, max: 20000 },
  '法律': { min: 6000, max: 15000 },
  '餐饮': { min: 5000, max: 10000 },
  '旅游': { min: 5000, max: 10000 },
};

/** 按岗位关键字微调系数 */
function getPositionMultiplier(jobTitle: string): number {
  const title = jobTitle.toLowerCase();
  const seniorKeywords = ['高级', '资深', '主管', '经理', '架构师', '专家', 'leader', 'senior', 'staff'];
  const juniorKeywords = ['实习', '助理', '初级', '应届', '培训生', '管培生', 'intern', 'junior', 'trainee'];
  
  for (const kw of seniorKeywords) {
    if (title.includes(kw)) return 1.5;
  }
  for (const kw of juniorKeywords) {
    if (title.includes(kw)) return 0.7;
  }
  return 1.0;
}

export function estimateDefaultSalary(industry?: string, jobTitle?: string): { min: number; max: number } | null {
  // 先查行业匹配
  if (industry) {
    for (const [key, range] of Object.entries(INDUSTRY_DEFAULTS)) {
      if (industry.includes(key)) {
        const multiplier = getPositionMultiplier(jobTitle || '');
        return {
          min: Math.round(range.min * multiplier),
          max: Math.round(range.max * multiplier),
        };
      }
    }
  }
  
  // 无行业匹配 → 岗位关键字兜底
  const multiplier = getPositionMultiplier(jobTitle || '');
  const baseMin = 6000;
  const baseMax = 15000;
  return {
    min: Math.round(baseMin * multiplier),
    max: Math.round(baseMax * multiplier),
  };
}


export function parseSalaryRange(salaryRange: string): {
  min: number;
  max: number;
} | null {
  if (!salaryRange) return null;

  const cleaned = salaryRange.toLowerCase().replace(/\s/g, '').replace(/\/月/g, '');

  // 1. 中文单位格式："X千-Y万"、"X千-Y千"、"X万-Y万"
  const chineseMatch = cleaned.match(/(\d+\.?\d*)\s*([万千])\s*[-–—~至到]\s*(\d+\.?\d*)\s*([万千])?/);
  if (chineseMatch) {
    const unit1 = chineseMatch[2]! === '万' ? 10000 : 1000;
    const unit2 = (chineseMatch[4] || chineseMatch[2]) === '万' ? 10000 : 1000;
    const cMin = parseFloat(chineseMatch[1]!) * unit1;
    const cMax = parseFloat(chineseMatch[3]!) * unit2;
    return { min: Math.round(cMin), max: Math.round(cMax) };
  }

  // 2. 标准格式："8k-12k"、"8000-12000"、"8K-12K"
  const pattern = /(\d+\.?\d*)\s*k?\s*[-–—~至到]\s*(\d+\.?\d*)\s*k?/i;
  const match = cleaned.match(pattern);

  if (!match) return null;

  let min = parseFloat(match[1]!)!;
  let max = parseFloat(match[2]!)!;

  if (/k/i.test(salaryRange)) {
    min *= 1000;
    max *= 1000;
  }

  return { min: Math.round(min), max: Math.round(max) };
}

// ============================================================
// 4. 竞争力百分位
// ============================================================

export interface CompetencyPercentileResult {
  /** 用户百分位排名 0-100（越高越强） */
  percentileRank: number;
  /** 用户在总人数中的排名（1=最强） */
  rank: number;
  /** 总比较人数 */
  totalPeers: number;
  /** 用户的匹配度 */
  userMatchScore: number;
  /** 统计信息 */
  statistics: {
    averageScore: number;
    medianScore: number;
    topDecileScore: number; // 前10%的门槛分
  };
}

/**
 * 计算用户在同岗位中的竞争力百分位
 *
 * 算法：
 *   percentileRank = (排名 / 总人数) × 100
 *   排名方式：分数越高排名越前（rank=1 最强）
 *   百分位含义：超过多少比例的竞争者
 *
 * @param userMatchScore - 当前用户的匹配度
 * @param peerScores     - 同岗位其他用户的匹配度列表
 */
export function calculateCompetencyPercentile(
  userMatchScore: number,
  peerScores: PeerMatchScore[]
): CompetencyPercentileResult {
  const allScores = [
    ...peerScores.map((p) => p.matchScore),
    userMatchScore,
  ];

  const totalPeers = allScores.length;

  if (totalPeers === 1) {
    return {
      percentileRank: 100,
      rank: 1,
      totalPeers: 1,
      userMatchScore,
      statistics: {
        averageScore: userMatchScore,
        medianScore: userMatchScore,
        topDecileScore: userMatchScore,
      },
    };
  }

  // 降序排列，计算用户排名
  const sorted = [...allScores].sort((a, b) => b - a);
  const _rank = sorted.indexOf(userMatchScore) + 1;

  // 百分位：超过 (totalPeers - rank) / (totalPeers - 1) × 100 的竞争者
  // 如果多人同分，取最高百分位
  const _sameScoreCount = sorted.filter((s) => s === userMatchScore).length;
  const bestRank = sorted.indexOf(userMatchScore) + 1;
  const percentileRank =
    totalPeers > 1
      ? Math.round(((totalPeers - bestRank) / (totalPeers - 1)) * 100)
      : 100;

  // 统计信息
  const sum = allScores.reduce((a, b) => a + b, 0);
  const averageScore = Math.round(sum / totalPeers);

  const mid = Math.floor(sorted.length / 2);
  const medianScore =
    sorted.length % 2 !== 0
      ? sorted[mid]
      : Math.round(((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2);

  // 前10%门槛
  const topDecileIndex = Math.max(0, Math.ceil(sorted.length * 0.1) - 1);
  const topDecileScore = sorted[topDecileIndex];

  return {
    percentileRank,
    rank: bestRank,
    totalPeers,
    userMatchScore,
    statistics: {
      averageScore,
      medianScore: medianScore!,
      topDecileScore: topDecileScore!,
    },
  };
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 技能名称标准化：小写、去空格、去括号内容
 * 用于匹配时忽略大小写和格式差异
 */
function normalizeSkillName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/（.*?）/g, '')
    .replace(/\(.*?\)/g, '')
    .trim();
}

/**
 * 在用户技能表中查找匹配项
 * 支持精确匹配和模糊匹配（基于编辑距离相似度）
 */
function findMatchingSkill(
  normalizedReq: string,
  userSkillMap: Map<string, UserSkill>,
  fuzzyThreshold: number
): UserSkill | null {
  // 1. 精确匹配
  if (userSkillMap.has(normalizedReq)) {
    return userSkillMap.get(normalizedReq)!;
  }

  // 2. 包含匹配（如 "Java" 匹配 "java开发"）
  // 最短字符数阈值：避免 "ql"⊂"sql" 等短词误匹配
  for (const [key, skill] of userSkillMap) {
    const shorter = key.length < normalizedReq.length ? key : normalizedReq;
    // 短词（≤2字符）不触发包含匹配，避免 "ql"⊂"sql"、"c"⊂"c++" 误匹配
    if (shorter.length > 2 && (key.includes(normalizedReq) || normalizedReq.includes(key))) {
      return skill;
    }
  }

  // 3. 模糊匹配（编辑距离相似度）
  if (fuzzyThreshold > 0) {
    let bestMatch: UserSkill | null = null;
    let bestSimilarity = 0;

    for (const [key, skill] of userSkillMap) {
      const similarity = computeSimilarity(normalizedReq, key);
      if (similarity >= fuzzyThreshold && similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = skill;
      }
    }

    return bestMatch;
  }

  return null;
}

/**
 * 计算两个字符串的相似度（0-1）
 * 基于最长公共子序列长度
 */
function computeSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;

  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;

  const lcsLen = longestCommonSubsequence(a, b);
  return lcsLen / maxLen;
}

/**
 * 最长公共子序列长度
 */
function longestCommonSubsequence(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  // 滚动数组优化空间
  let prev = new Array(n + 1).fill(0);
  let curr = new Array(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        curr[j] = prev[j - 1] + 1;
      } else {
        curr[j] = Math.max(prev[j], curr[j - 1]);
      }
    }
    [prev, curr] = [curr, prev];
    curr.fill(0);
  }

  return prev[n];
}

/**
 * 估算阶段学习时长
 * 粗略规则：每项技能约7天，最少7天
 */
function estimatePhaseDuration(skillCount: number): number {
  return Math.max(7, skillCount * 7);
}

// ============================================================
// 便捷工具：从数据库原始数据构建输入
// ============================================================

/**
 * 从 jobs 表的 skills 字符串解析出技能要求列表
 * 支持逗号分隔和编号列表格式
 *
 * 示例输入：
 *   "学科教学,学生管理"
 *   "1. 熟练操作招聘渠道；2. 掌握简历筛选技能"
 */
export function parseJobSkills(skillsStr: string): JobSkillRequirement[] {
  if (!skillsStr || !skillsStr.trim()) return [];

  // 尝试按编号列表格式解析（如 "1. xxx；2. xxx"）
  if (/\d+[.、．]/.test(skillsStr)) {
    return skillsStr
      .split(/[；;]/)
      .map((s) => s.replace(/^\s*\d+[.、．]\s*/, '').trim())
      .filter(Boolean)
      .map((name) => ({ name, required: true }));
  }

  // 按逗号分隔
  return skillsStr
    .split(/[,，、；;]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((name) => ({ name, required: true }));
}

/**
 * 从 user_profiles 的 ability_background jsonb 提取用户技能列表
 */
export function extractUserSkillsFromAbilityBackground(
  abilityBackground: Record<string, unknown> | null | undefined
): UserSkill[] {
  if (!abilityBackground || typeof abilityBackground !== 'object') return [];

  const skills: UserSkill[] = [];

  // 专业核心技能
  const coreSkills = abilityBackground.coreSkills as string[] | undefined;
  if (Array.isArray(coreSkills)) {
    coreSkills.forEach((name) => {
      if (name) skills.push({ name, level: 3, proficiency: '基础' });
    });
  }

  // 办公软件技能
  const officeSkills = abilityBackground.officeSkills as string[] | undefined;
  if (Array.isArray(officeSkills)) {
    officeSkills.forEach((name) => {
      if (name) skills.push({ name, level: 2, proficiency: '入门' });
    });
  }

  // 外语能力
  const languages = abilityBackground.languages as Array<{
    language: string;
    level: string;
  }> | undefined;
  if (Array.isArray(languages)) {
    languages.forEach((lang) => {
      if (lang.language) {
        skills.push({
          name: lang.language,
          level: mapLanguageLevelToNumber(lang.level),
          proficiency: lang.level,
        });
      }
    });
  }

  // 职业技能证书
  const certificates = abilityBackground.certificates as string[] | undefined;
  if (Array.isArray(certificates)) {
    certificates.forEach((name) => {
      if (name) skills.push({ name, level: 3, proficiency: '持证' });
    });
  }

  return skills;
}

/**
 * 从 user_profiles.skills 文本字段提取技能列表
 */
export function parseUserSkillsFromText(skillsText: string | null | undefined): UserSkill[] {
  if (!skillsText || !skillsText.trim()) return [];

  return skillsText
    .split(/[,，、；;|\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((name) => ({ name, level: 3, proficiency: '基础' }));
}

/** 外语等级映射为数字 */
function mapLanguageLevelToNumber(level: string): number {
  const map: Record<string, number> = {
    'CET-4': 3,
    'CET-6': 4,
    '雅思6.0': 4,
    '雅思6.5': 4,
    '雅思7.0': 5,
    '雅思7.5': 5,
    '托福80': 4,
    '托福90': 4,
    '托福100': 5,
    '专四': 4,
    '专八': 5,
    'N1': 5,
    'N2': 4,
    'N3': 3,
    '初级': 2,
    '中级': 3,
    '高级': 5,
  };
  return map[level] || 3;
}
