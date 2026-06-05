/**
 * JD RAG 模块 - 从本地job_descriptions表检索相关JD作为上下文
 * 用于职搭子JD助手智能体迁移
 */

import { getSupabaseAdmin } from '@/lib/supabase';

const STANDARD_INDUSTRIES = [
  '互联网/IT', '金融', '教育', '医疗健康', '制造业', '电商', '新能源',
  '房地产', '物流', '传媒', '法律', '餐饮', '咨询', '人力资源',
  '市场营销', '财务', '政府/公共管理', '游戏', '农林牧渔',
  '化工/能源/环保', '公共事业/NGO', '建筑/土木', '旅游/酒店',
  '文化艺术', '体育/健身', '汽车', '通信/硬件',
];

/**
 * 从用户查询中提取搜索关键词
 */
function extractKeywords(query: string): {
  industries: string[];
  keywords: string[];
  city?: string;
} {
  const industries: string[] = [];
  const keywords: string[] = [];
  let city: string | undefined;

  // 提取行业关键词
  for (const ind of STANDARD_INDUSTRIES) {
    if (query.includes(ind) || query.includes(ind.split('/')[0]!)) {
      industries.push(ind);
    }
  }

  // 提取城市
  const cityPattern = /(北京|上海|广州|深圳|杭州|成都|武汉|南京|西安|重庆|苏州|长沙|南宁|合肥|郑州|厦门|青岛|大连|天津|宁波|无锡|福州|济南|昆明|贵阳|太原|沈阳|哈尔滨|长春)/;
  const cityMatch = query.match(cityPattern);
  if (cityMatch) city = cityMatch[1];

  // 提取职位/技能关键词（去掉常见停用词）
  const stopWords = new Set(['的', '了', '是', '在', '有', '和', '与', '或', '我', '你', '他', '她', '想', '要', '能', '可以', '请', '帮', '看看', '查', '找', '岗位', '职位', '工作', '什么', '哪些', '怎么', '如何', '多少']);
  const words = query.replace(/[，。！？、；：""''（）\[\]{}]/g, ' ').split(/\s+/);
  for (const word of words) {
    if (word.length >= 2 && !stopWords.has(word)) {
      keywords.push(word);
    }
  }

  return { industries, keywords, city };
}

/**
 * 从job_descriptions表检索相关JD
 */
export async function searchRelevantJDs(query: string, limit: number = 8): Promise<string> {
  const { industries, keywords, city } = extractKeywords(query);
  const supabase = getSupabaseAdmin();

  let queryBuilder = supabase
    .from('job_descriptions')
    .select('job_title, industry, salary_range, city, education, experience, responsibilities')
    .eq('status', 'parsed')
    .limit(limit * 3); // 多取一些再过滤

  // 按行业筛选
  if (industries.length > 0) {
    queryBuilder = queryBuilder.in('industry', industries);
  }

  // 按城市筛选
  if (city) {
    queryBuilder = queryBuilder.ilike('city', `%${city}%`);
  }

  const { data, error } = await queryBuilder;

  if (error || !data || data.length === 0) {
    // 回退：不筛选行业，只按关键词搜索
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('job_descriptions')
      .select('job_title, industry, salary_range, city, education, experience, responsibilities')
      .eq('status', 'parsed')
      .limit(limit);

    if (fallbackError || !fallbackData) return '';

    return formatJDs(fallbackData.slice(0, limit), query);
  }

  // 关键词相关性排序
  const scored = data.map(jd => {
    let score = 0;
    const searchText = `${jd.job_title} ${jd.responsibilities}`.toLowerCase();
    for (const kw of keywords) {
      if (searchText.includes(kw.toLowerCase())) score += 2;
    }
    if (industries.length === 0 && jd.industry) score += 0.5; // 无行业筛选时微调
    return { ...jd, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return formatJDs(scored.slice(0, limit), query);
}

/**
 * 格式化JD数据为RAG上下文文本
 */
function formatJDs(jds: Array<Record<string, unknown>>, query: string): string {
  if (jds.length === 0) return '';

  let context = `以下是基于用户查询"${query}"检索到的${jds.length}个相关岗位信息：\n\n`;

  jds.forEach((jd, i) => {
    context += `【岗位${i + 1}】${jd.job_title}\n`;
    context += `行业：${jd.industry || '未知'} | 城市：${jd.city || '未知'} | 薪资：${jd.salary_range || '面议'}\n`;
    context += `学历：${jd.education || '不限'} | 经验：${jd.experience || '不限'}\n`;
    const resp = (jd.responsibilities as string) || '';
    // 截取前300字避免上下文过长
    context += `职责摘要：${resp.substring(0, 300)}${resp.length > 300 ? '...' : ''}\n\n`;
  });

  return context;
}

/**
 * 构建职搭子JD助手的系统提示词
 */
export function buildJDAssistantPrompt(ragContext: string): string {
  let systemPrompt = `你是"职搭子"——职途星平台的AI岗位助手。你精通27个行业的岗位信息，能帮用户精准查询和分析岗位。

你的能力：
1. 根据用户描述的意向，推荐匹配的岗位方向
2. 分析岗位的职责要求、薪资水平、发展前景
3. 对比不同岗位的优劣势
4. 提供求职建议和技能提升方向

回答规范：
- 基于检索到的真实岗位数据回答，不要编造
- 如果检索不到相关数据，坦诚说明并建议用户换个关键词
- 给出具体、实用的建议，不要泛泛而谈
- 适当引用岗位数据支撑你的分析`;

  if (ragContext) {
    systemPrompt += `\n\n--- 参考数据 ---\n${ragContext}\n--- 请基于以上参考数据回答用户问题 ---`;
  }

  return systemPrompt;
}
