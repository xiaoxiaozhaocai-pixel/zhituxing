/**
 * 桂电知识飞轮 — 从小职对话中自动提取桂电知识并存入 guet_knowledge
 *
 * 数据飞轮逻辑：
 * 用户聊天 → 提取桂电知识点 → 写入Supabase → RAG召回 → 小职更懂桂电 → 更多用户使用
 *
 * 触发条件：仅小职对话（xiaozhi / xiaozhi_chat）、对话涉及桂电相关内容
 * 写入策略：fire-and-forget，不阻塞用户响应
 */

import { getSupabaseAdmin } from '@/lib/supabase';

// ============================================================
// 类型
// ============================================================

interface GuetKnowledgeItem {
  category: string;
  content: string;
  tags: string[];
  confidence?: number;
}

// 标准 category 白名单 — 收敛到 10 类，避免 67 类碎片化
const ALLOWED_CATEGORIES = [
  '校园生活',
  '专业信息',
  '就业去向',
  '考研保研',
  '社团活动',
  '校园设施',
  '学术资源',
  '食堂美食',
  '学生文化',
  '其他',
] as const;

const MIN_CONFIDENCE = 0.7;

// 桂电相关关键词 — 用于快速判断对话是否涉及桂电
const GUET_KEYWORDS = [
  '桂电', '桂林电子科技大学', '桂林电科大', 'guet', 'GUET',
  '花江', '金鸡岭', '北海校区', '尧山',
  '二院', '三院', '四院', '五院', '六院', '七院', '八院', '九院', '十院',
  '信科', '机电', '计算机', '商学院', '外国语', '数学', '电子工程',
  '人工智能学院', '法学院', '材料', '生命与环境',
  '思源湖', '图书馆', '食堂', '宿舍', '教学楼',
  '桂电学生', '桂电就业', '桂电考研', '桂电专业', '桂电老师',
  '桂电社团', '桂电校招', '桂电双选会', '桂电校企',
  '桂林电子科技大学就业', '桂电毕业生',
];

/** 判断消息是否涉及桂电 */
function isGuetRelated(message: string): boolean {
  const lower = message.toLowerCase();
  return GUET_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
}

// ============================================================
// DeepSeek 提取
// ============================================================

const EXTRACTION_PROMPT = `你是一个校园知识提取器。你的任务是从用户与AI助手的对话中，提取关于桂林电子科技大学（桂电）的事实性知识点。

规则：
1. 只提取与桂电直接相关的事实信息（校园生活、专业信息、就业情况、考研数据、社团活动、校园设施、老师信息、学生文化等）
2. 不要提取求职建议、闲聊、非桂电内容
3. 每条知识点必须是完整的事实陈述，不是碎片
4. 如果对话中没有桂电相关知识，返回空数组 []
5. category 必须严格从以下 10 类选择（不可自创）：校园生活、专业信息、就业去向、考研保研、社团活动、校园设施、学术资源、食堂美食、学生文化、其他
6. tags 用2-4个标签概括
7. confidence 0-1 浮点数，表示该知识点准确性置信度（事实陈述+0.3、有具体数据+0.3、有时间地点+0.2、其他基础0.2）

输出格式（纯JSON数组，不要markdown包裹）：
[{"category":"校园设施","content":"花江校区图书馆考试周期间开放到晚上11点","tags":["图书馆","花江校区","考试周"],"confidence":0.9}]

用户消息：
{userMessage}

助手回复：
{assistantResponse}

请提取桂电知识点（JSON数组）：`;

async function extractWithDeepSeek(userMessage: string, assistantResponse: string): Promise<GuetKnowledgeItem[]> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.log('[guet-flywheel] DeepSeek API key not configured, skipping');
    return [];
  }

  const prompt = EXTRACTION_PROMPT
    .replace('{userMessage}', userMessage)
    .replace('{assistantResponse}', assistantResponse);

  try {
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 1024,
      }),
    });

    if (!res.ok) {
      console.error('[guet-flywheel] DeepSeek extraction error:', res.status);
      return [];
    }

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content?.trim() || '';
    
    // 清理可能的 markdown 包裹
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
    
    if (cleaned === '[]' || !cleaned) return [];

    const items = JSON.parse(cleaned);
    if (!Array.isArray(items)) return [];

    return items.filter((item: GuetKnowledgeItem) => {
      if (!item.category || !item.content || !item.tags || item.tags.length === 0) return false;
      // category 白名单（不在白名单的归"其他"）
      if (!ALLOWED_CATEGORIES.includes(item.category as typeof ALLOWED_CATEGORIES[number])) {
        item.category = '其他';
      }
      // confidence 阈值过滤（缺省视为 0.5，低于阈值丢弃）
      const conf = typeof item.confidence === 'number' ? item.confidence : 0.5;
      return conf >= MIN_CONFIDENCE;
    });
  } catch (err) {
    console.error('[guet-flywheel] Extraction failed:', err);
    return [];
  }
}

// ============================================================
// 去重 & 写入
// ============================================================

async function isDuplicate(content: string): Promise<boolean> {
  try {
    const supabase = getSupabaseAdmin();
    const prefix = content.substring(0, 50).replace(/'/g, "''");
    const { data, error } = await supabase
      .from('guet_knowledge')
      .select('id')
      .ilike('content', `${prefix}%`)
      .limit(1);

    if (error) {
      console.error('[guet-flywheel] Duplicate check error:', error);
      return false;
    }
    return (data?.length || 0) > 0;
  } catch (err) {
    console.error('[guet-flywheel] Duplicate check exception:', err);
    return false;
  }
}

async function insertKnowledge(item: GuetKnowledgeItem): Promise<boolean> {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('guet_knowledge')
      .insert({
        category: item.category,
        content: item.content,
        tags: item.tags,
      });

    if (error) {
      console.error('[guet-flywheel] Insert error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[guet-flywheel] Insert exception:', err);
    return false;
  }
}

// ============================================================
// 主入口
// ============================================================

interface FlywheelParams {
  userMessage: string;
  assistantResponse: string;
  botType: string;
}

/** 
 * 桂电知识飞轮主函数（fire-and-forget）
 * 调用时机：小职每次对话完成后异步调用
 */
export async function runGuetFlywheel(params: FlywheelParams): Promise<void> {
  const { userMessage, assistantResponse, botType } = params;

  // 仅小职对话触发
  if (!['xiaozhi', 'xiaozhi_chat'].includes(botType)) return;

  // 快速判断：对话是否涉及桂电
  const combined = `${userMessage} ${assistantResponse}`;
  if (!isGuetRelated(combined)) {
    return;
  }

  console.log('[guet-flywheel] 🎯 Guet-related chat detected, extracting...');

  // Step 1: 用 DeepSeek 提取知识点
  const items = await extractWithDeepSeek(userMessage, assistantResponse);
  
  if (items.length === 0) return;

  console.log(`[guet-flywheel] Extracted ${items.length} items`);

  // Step 2: 去重 + 写入
  let saved = 0;
  for (const item of items) {
    const dup = await isDuplicate(item.content);
    if (dup) continue;

    const ok = await insertKnowledge(item);
    if (ok) {
      saved++;
      console.log(`[guet-flywheel] ✅ Saved: [${item.category}] ${item.content.substring(0, 50)}...`);
    }
  }

  console.log(`[guet-flywheel] Done: ${saved}/${items.length} new items`);
}

/** 查看飞轮统计 */
export async function getFlywheelStats(): Promise<{ total: number; categories: Record<string, number> }> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('guet_knowledge')
      .select('category');

    if (error || !data) return { total: 0, categories: {} };

    const categories: Record<string, number> = {};
    for (const row of data) {
      categories[row.category] = (categories[row.category] || 0) + 1;
    }

    return { total: data.length, categories };
  } catch {
    return { total: 0, categories: {} };
  }
}
