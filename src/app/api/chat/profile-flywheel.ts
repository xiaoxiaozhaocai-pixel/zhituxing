/**
 * 用户画像飞轮 — 从小职对话中自动提取个人信息并存入 user_profiles
 *
 * 数据飞轮逻辑：
 * 用户聊天 → 提取个人信息 → 写入 user_profiles → 下次对话注入上下文 → 所有智能体共享
 *
 * 触发条件：仅小职对话（xiaozhi / xiaozhi_chat）
 * 写入策略：fire-and-forget，不阻塞用户响应；只更新有新值的字段，不覆盖已有数据
 */

import { LLM_BASE_URL } from '@/lib/llm-router';
import { getSupabaseAdmin } from '@/lib/supabase';

// ============================================================
// 类型
// ============================================================

interface ProfileUpdate {
  major?: string;
  grade?: string;
  graduation_year?: string;
  target_job?: string;
  target_cities?: string[];
  target_industry?: string;
  gpa?: string;
  personality_type?: string;
  economic_pressure?: string;
  career_tendency?: string;
  hard_skills?: string[];
  soft_skills?: string[];
}

// 个人信息关键词 — 快速判断是否值得提取
const PROFILE_KEYWORDS = [
  '我是', '专业', '年级', '大二', '大三', '大四', '研一', '研二', '研三',
  '毕业', '想找', '想做', '目标', '意向', '行业', '城市',
  'GPA', '成绩', 'MBTI', '性格', '技能', '擅长', '会', '熟练',
  '经济', '考研', '就业', '实习', '项目', '获奖',
  '人力', '计算机', '软件', '电子', '机械', '会计', '金融',
];

/** 快速判断消息是否包含可提取的个人信息 */
function hasProfileInfo(message: string): boolean {
  const lower = message.toLowerCase();
  return PROFILE_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
}

// ============================================================
// DeepSeek 提取
// ============================================================

const EXTRACTION_PROMPT = `你是一个用户画像提取器。从用户与AI助手的对话中提取用户的个人信息。

规则：
1. 只提取用户明确说出的信息，绝对不要推测或编造
2. 用户没说到的字段不要填
3. grade 只取：大一、大二、大三、大四、研一、研二、研三、已毕业
4. graduation_year 是纯数字年份，如 2027
5. economic_pressure 只取：none（无压力）、little（有一定压力）、heavy（压力较大）
6. career_tendency 只取：academic（偏学术研究）、practice（偏实践工作）、undecided（还没想好）
7. hard_skills 和 soft_skills 各最多 5 项
8. 如果没有任何个人信息，返回 {}

输出格式（纯JSON，不要markdown包裹）：
{"major":"人力资源管理","grade":"大三"}

用户消息：
{userMessage}

助手回复：
{assistantResponse}

请提取个人信息（JSON）：`;

async function extractWithDeepSeek(userMessage: string, assistantResponse: string): Promise<ProfileUpdate> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.log('[profile-flywheel] DeepSeek API key not configured, skipping');
    return {};
  }

  const prompt = EXTRACTION_PROMPT
    .replace('{userMessage}', userMessage)
    .replace('{assistantResponse}', assistantResponse);

  try {
    const res = await fetch(`${LLM_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 512,
      }),
    });

    if (!res.ok) {
      console.error('[profile-flywheel] DeepSeek extraction error:', res.status);
      return {};
    }

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content?.trim() || '';

    // 清理 markdown 包裹
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();

    if (!cleaned || cleaned === '{}') return {};

    const parsed = JSON.parse(cleaned);
    return removeEmptyValues(parsed);
  } catch (err) {
    console.error('[profile-flywheel] Extraction failed:', err);
    return {};
  }
}

/** 移除空值、空数组 */
function removeEmptyValues(obj: Record<string, unknown>): ProfileUpdate {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined || value === '') continue;
    if (Array.isArray(value) && value.length === 0) continue;
    result[key] = value;
  }
  return result as ProfileUpdate;
}

// ============================================================
// 写入 Supabase
// ============================================================

/** 获取当前用户画像，用于合并 */
async function getCurrentProfile(userId: string): Promise<Record<string, unknown>> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) return {};
    return data;
  } catch (err) {
    console.error('[profile-flywheel] Fetch current profile error:', err);
    return {};
  }
}

/** 合并新旧数据，upsert 到 user_profiles */
async function upsertProfile(userId: string, updates: ProfileUpdate): Promise<boolean> {
  try {
    // 获取现有画像，只覆盖有新值的字段
    const current = await getCurrentProfile(userId);
    const merged: Record<string, unknown> = { ...current, user_id: userId };

    // 字段映射：将提取的字段合并到 Supabase 字段
    const fieldMapping: Record<string, string> = {
      major: 'major',
      grade: 'grade',
      graduation_year: 'graduation_year',
      target_job: 'target_job',
      target_cities: 'target_cities',
      target_industry: 'target_industry',
      gpa: 'gpa',
      personality_type: 'personality_type',
      economic_pressure: 'economic_pressure',
      career_tendency: 'career_tendency',
      hard_skills: 'hard_skills',
      soft_skills: 'soft_skills',
    };

    let hasNewInfo = false;
    for (const [key, dbField] of Object.entries(fieldMapping)) {
      const newVal = (updates as Record<string, unknown>)[key];
      if (newVal !== undefined && newVal !== null) {
        // 数组字段：合并去重
        if (Array.isArray(newVal) && Array.isArray(merged[dbField])) {
          const existing = merged[dbField] as string[];
          const incoming = newVal as string[];
          const combined = [...new Set([...existing, ...incoming])];
          if (combined.length !== existing.length) {
            merged[dbField] = combined;
            hasNewInfo = true;
          }
        } else if (JSON.stringify(newVal) !== JSON.stringify(merged[dbField])) {
          merged[dbField] = newVal;
          hasNewInfo = true;
        }
      }
    }

    if (!hasNewInfo) return false;

    // 如果没有现有记录，insert；否则 update
    const supabase = getSupabaseAdmin();
    if (!current || Object.keys(current).length === 0) {
      const { error } = await supabase
        .from('user_profiles')
        .insert(merged);

      if (error) {
        console.error('[profile-flywheel] Insert error:', error);
        return false;
      }
    } else {
      const { error } = await supabase
        .from('user_profiles')
        .update(merged)
        .eq('user_id', userId);

      if (error) {
        console.error('[profile-flywheel] Update error:', error);
        return false;
      }
    }

    return true;
  } catch (err) {
    console.error('[profile-flywheel] Upsert exception:', err);
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
  userId: string;
}

/**
 * 用户画像飞轮主函数（fire-and-forget）
 * 调用时机：小职每次对话完成后异步调用
 */
export async function runProfileFlywheel(params: FlywheelParams): Promise<void> {
  const { userMessage, assistantResponse, botType, userId } = params;

  // 仅小职对话触发
  if (!['xiaozhi', 'xiaozhi_chat'].includes(botType)) return;
  if (!userId) return;

  // 快速判断：对话是否有个人信息
  if (!hasProfileInfo(userMessage)) return;

  console.log('[profile-flywheel] 🔍 Potential profile info detected, extracting...');

  // Step 1: 用 DeepSeek 提取个人信息
  const profile = await extractWithDeepSeek(userMessage, assistantResponse);
  if (Object.keys(profile).length === 0) return;

  const fields = Object.keys(profile).join(', ');
  console.log(`[profile-flywheel] Extracted: ${fields}`);

  // Step 2: 合并 + 写入
  const saved = await upsertProfile(userId, profile);
  if (saved) {
    console.log(`[profile-flywheel] ✅ Profile updated: ${fields}`);
  } else {
    console.log('[profile-flywheel] No new info to save');
  }
}
