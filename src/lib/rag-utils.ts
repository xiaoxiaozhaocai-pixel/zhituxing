/**
 * RAG 工具库 - 供智能体路由复用
 * 提供关键词提取、表查询、上下文构建、DeepSeek RAG 流等通用能力
 */

import { getSupabaseAdmin } from '@/lib/supabase';
import { createDeepSeekSSEStream, type ChatMessage, type DeepSeekUsage } from '@/lib/deepseek-chat';

// ============================================================
// 常量定义
// ============================================================

/** 27个标准行业名 */
export const STANDARD_INDUSTRIES = [
  '互联网/IT', '电商', '市场营销', '人力资源', '金融', '教育培训',
  '文化艺术', '游戏', '体育', '健身', '制造业', '建筑', '土木',
  '旅游', '酒店', '政府', '公共管理', '医疗', '健康', '法律',
  '咨询', '物流', '供应链', '房地产', '农业', '林业', '渔业',
  '综合/其他',
];

/** 常见城市 */
export const COMMON_CITIES = [
  '北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '南京',
  '西安', '重庆', '苏州', '长沙', '南宁', '合肥', '郑州', '厦门',
  '青岛', '大连', '天津', '宁波', '无锡', '福州', '济南', '昆明',
  '贵阳', '太原', '沈阳', '哈尔滨', '长春',
];

/** C 端公开 JD 字段（不含 source_url/source_platform/raw_jd） */
export const PUBLIC_JD_FIELDS = [
  'id', 'job_title', 'company', 'industry', 'city',
  'salary_range', 'education', 'experience',
  'post_nature', 'responsibilities', 'hard_skills', 'soft_skills', 'tags',
  'fresh_graduate_friendly', 'graduate_friendly_level',
  'company_type', 'core_duty_module', 'major_require',
  'bonus_skill_cert', 'post_category', 'party_label',
  'is_synthetic', 'url_status', 'status', 'created_at', 'updated_at',
].join(', ')

/** 常见岗位关键词 */
export const COMMON_JOB_KEYWORDS = [
  '产品经理', '产品运营', '运营', 'UI设计', 'UX设计', '设计师',
  '前端', '后端', '全栈', '测试', 'QA', '运维', 'SRE',
  '数据分析师', '算法工程师', '人工智能', 'AI', '大数据',
  'Java', 'Python', 'Go', 'Node', 'React', 'Vue',
  '人事', 'HR', '招聘', '财务', '会计', '行政',
  '市场', '品牌', '公关', '销售', '商务',
  '项目经理', '技术经理', '架构师', '总监', 'CTO', 'CEO',
];

// ============================================================
// 类型定义
// ============================================================

/** 提取的关键词结果 */
export interface ExtractedKeywords {
  industry?: string;
  jobTitle?: string;
  city?: string;
  skills?: string[];
  keywords?: string[];
}

/** 查询过滤条件 */
export interface QueryFilter {
  field: string;
  operator: 'eq' | 'ilike' | 'in' | 'gte' | 'lte';
  value: string | number | boolean | string[];
}

/** RAG 上下文配置 */
export interface RAGContextConfig {
  maxTableRows?: number;
  maxTextLength?: number;
  includeMetadata?: boolean;
}

/** RAG 数据源 */
export interface RAGDataSource {
  tableName: string;
  displayName: string;
  data: Record<string, unknown>[];
  fields?: string[];
}

// ============================================================
// 功能1：extractKeywords - 从用户输入提取关键词
// ============================================================

/**
 * 从用户消息中提取结构化关键词
 * @param message 用户消息
 * @returns 提取的关键词对象
 */
export function extractKeywords(message: string): ExtractedKeywords {
  const result: ExtractedKeywords = {};
  const lowerMessage = message.toLowerCase();

  // 提取行业
  for (const industry of STANDARD_INDUSTRIES) {
    const simpleName = industry.split('/')[0];
    if (message.includes(industry) || message.includes(simpleName)) {
      result.industry = industry;
      break;
    }
  }

  // 提取城市
  for (const city of COMMON_CITIES) {
    if (message.includes(city)) {
      result.city = city;
      break;
    }
  }

  // 提取岗位/技能
  const foundSkills: string[] = [];
  for (const keyword of COMMON_JOB_KEYWORDS) {
    if (lowerMessage.includes(keyword.toLowerCase())) {
      foundSkills.push(keyword);
    }
  }
  if (foundSkills.length > 0) {
    result.skills = foundSkills;
  }

  // 提取岗位名称（优先匹配长词）
  const jobTitlePatterns = [
    /(?:岗位|职位|应聘|求职)[：:]*\s*([^\s，。！？]+)/,
    /([^\s，。！？]+)(?:工程师|经理|总监|专员|助理|设计师|分析师)/,
  ];
  for (const pattern of jobTitlePatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      result.jobTitle = match[1].trim();
      break;
    }
  }

  // 通用关键词提取（去除停用词）
  const stopWords = new Set([
    '的', '了', '是', '在', '有', '和', '与', '或', '我', '你', '他', '她',
    '想', '要', '能', '可以', '请', '帮', '看看', '查', '找', '什么', '哪些',
    '怎么', '如何', '多少', '为什么', '哪个', '怎样', '一下', '吗', '呢', '吧',
  ]);
  const words = message
    .replace(/[，。！？、；：""''（）\[\]{}【】《》]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !stopWords.has(w));
  if (words.length > 0) {
    result.keywords = words.slice(0, 10); // 最多10个
  }

  return result;
}

// ============================================================
// 功能2：querySupabase - 通用表查询
// ============================================================

/**
 * 通用 Supabase 表查询
 * @param tableName 表名
 * @param filters 过滤条件数组
 * @param limit 返回条数限制
 * @param selectFields 选择字段（默认 *）
 * @returns 查询结果数组
 */
export async function querySupabase(
  tableName: string,
  filters: QueryFilter[] = [],
  limit: number = 10,
  selectFields: string = '*'
): Promise<Record<string, unknown>[]> {
  try {
    const supabase = getSupabaseAdmin();

    let query = supabase
      .from(tableName)
      .select(selectFields)
      .limit(limit);

    // 应用过滤条件
    for (const filter of filters) {
      switch (filter.operator) {
        case 'eq':
          query = query.eq(filter.field, filter.value);
          break;
        case 'ilike':
          query = query.ilike(filter.field, `%${filter.value}%`);
          break;
        case 'in':
          if (Array.isArray(filter.value)) {
            query = query.in(filter.field, filter.value);
          }
          break;
        case 'gte':
          query = query.gte(filter.field, filter.value);
          break;
        case 'lte':
          query = query.lte(filter.field, filter.value);
          break;
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error(`[querySupabase] Query error for ${tableName}:`, error);
      return [];
    }

    return (data as unknown as Record<string, unknown>[]) || [];
  } catch (error) {
    console.error(`[querySupabase] Exception for ${tableName}:`, error);
    return [];
  }
}

// ============================================================
// 功能3：buildRAGContext - 构建RAG上下文
// ============================================================

/**
 * 构建格式化的 RAG 上下文字符串
 * @param sources 数据源数组
 * @param config 配置选项
 * @returns 格式化的上下文字符串
 */
export function buildRAGContext(
  sources: RAGDataSource[],
  config: RAGContextConfig = {}
): string {
  const { maxTextLength = 300, includeMetadata = true } = config;

  if (sources.length === 0) {
    return '';
  }

  let context = '--- 参考数据 ---\n\n';
  let totalItems = 0;

  for (const source of sources) {
    if (!source.data || source.data.length === 0) continue;

    context += `【${source.displayName}】共 ${source.data.length} 条\n\n`;

    for (let i = 0; i < source.data.length; i++) {
      const item = source.data[i];
      totalItems++;

      const fields = source.fields || Object.keys(item);
      let itemText = '';

      for (const field of fields) {
        const value = item[field];
        if (value === null || value === undefined) continue;

        let valueStr: string;
        if (typeof value === 'string') {
          valueStr = value.length > maxTextLength
            ? value.substring(0, maxTextLength) + '...'
            : value;
        } else if (Array.isArray(value)) {
          valueStr = value.slice(0, 5).join(', ') + (value.length > 5 ? '...' : '');
        } else {
          valueStr = String(value);
        }

        itemText += `  ${field}: ${valueStr}\n`;
      }

      if (itemText) {
        context += `${i + 1}. ${itemText}\n`;
      }
    }

    context += '\n';
  }

  if (totalItems === 0) {
    return '';
  }

  context += `--- 共 ${totalItems} 条参考数据，请基于以上数据回答 ---\n`;

  return context;
}

// ============================================================
// 功能4：createDeepSeekRAGStream - 创建DeepSeek RAG流
// ============================================================

/**
 * 创建 DeepSeek RAG SSE 流
 * @param systemPrompt 系统提示词（含 RAG 上下文）
 * @param userMessage 用户消息
 * @param history 对话历史（可选）
 * @returns ReadableStream（SSE 格式）
 */
export function createDeepSeekRAGStream(
  systemPrompt: string,
  userMessage: string,
  history?: ChatMessage[],
  onComplete?: (result: { content: string; usage?: DeepSeekUsage }) => void
): ReadableStream {
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...(history || []),
    { role: 'user', content: userMessage },
  ];

  return createDeepSeekSSEStream({ messages, onComplete });
}

/**
 * 创建带 RAG 上下文的系统提示词
 * @param basePrompt 基础提示词
 * @param ragContext RAG 上下文
 * @returns 完整的系统提示词
 */
export function buildSystemPromptWithRAG(
  basePrompt: string,
  ragContext: string
): string {
  if (!ragContext) {
    return basePrompt;
  }
  return `${basePrompt}\n\n${ragContext}`;
}

// ============================================================
// 辅助函数：特定表查询
// ============================================================

/**
 * 查询 JD 相关数据
 * @param keywords 提取的关键词
 * @param limit 返回条数限制
 */
export async function queryJDs(
  keywords: ExtractedKeywords,
  limit: number = 8
): Promise<Record<string, unknown>[]> {
  const filters: QueryFilter[] = [];

  if (keywords.industry) {
    filters.push({ field: 'industry', operator: 'ilike', value: keywords.industry });
  }
  if (keywords.city) {
    filters.push({ field: 'city', operator: 'ilike', value: keywords.city });
  }
  if (keywords.jobTitle) {
    filters.push({ field: 'job_title', operator: 'ilike', value: keywords.jobTitle });
  }

  return querySupabase('job_descriptions', filters, limit);
}

/**
 * 查询技能关系数据
 * @param skillName 技能名称
 * @param relationType 关系类型
 */
export async function querySkillRelations(
  skillName: string,
  relationType?: string
): Promise<Record<string, unknown>[]> {
  const filters: QueryFilter[] = [
    { field: 'source_skill', operator: 'ilike', value: skillName },
  ];

  if (relationType) {
    filters.push({ field: 'relation_type', operator: 'eq', value: relationType });
  }

  return querySupabase('skill_relations', filters, 20);
}

/**
 * 查询用户画像数据
 * @param userId 用户ID
 */
export async function queryUserProfile(
  userId: string
): Promise<Record<string, unknown> | null> {
  const results = await querySupabase(
    'user_profiles',
    [{ field: 'user_id', operator: 'eq', value: userId }],
    1
  );
  return results[0] || null;
}

/**
 * 查询测评结果数据
 * @param userId 用户ID
 * @param limit 返回条数限制
 */
export async function queryAssessmentResults(
  userId: string,
  limit: number = 5
): Promise<Record<string, unknown>[]> {
  return querySupabase(
    'assessment_results',
    [{ field: 'user_id', operator: 'eq', value: userId }],
    limit
  );
}
