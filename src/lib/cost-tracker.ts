/**
 * cost-tracker.ts
 * 成本追踪工具：记录每次 DeepSeek API 调用的 token 消耗
 * 异步写入 cost_logs 表，不阻塞主流程
 */

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || '';

interface UsageInfo {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface CostLogInput {
  user_id?: string | null;
  conversation_id?: string | null;
  bot_type: string;
  model: string;
  call_type: string;
  usage: UsageInfo;
}

/**
 * DeepSeek 模型定价（¥/1M tokens）
 * deepseek-chat: 输入 ¥1, 输出 ¥2
 * deepseek-reasoner: 输入 ¥4, 输出 ¥16
 */
const MODEL_PRICES: Record<string, { input: number; output: number }> = {
  'deepseek-chat': { input: 1, output: 2 },
  'deepseek-v4-flash': { input: 1, output: 2 },
  'deepseek-reasoner': { input: 4, output: 16 },
};

function calculateCost(model: string, usage: UsageInfo): number {
  const prices = MODEL_PRICES[model] || MODEL_PRICES['deepseek-chat'];
  const inputCost = (usage.prompt_tokens / 1_000_000) * prices.input;
  const outputCost = (usage.completion_tokens / 1_000_000) * prices.output;
  return inputCost + outputCost;
}

/**
 * 异步记录成本日志，不阻塞主流程
 */
export async function trackCost(input: CostLogInput): Promise<void> {
  try {
    const { user_id, conversation_id, bot_type, model, call_type, usage } = input;
    const cost_yuan = calculateCost(model, usage);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    if (!supabaseUrl || !SERVICE_ROLE_KEY) return;

    await fetch(`${supabaseUrl}/rest/v1/cost_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        collect_date: new Date().toISOString().slice(0, 10),
        source: 'deepseek',
        call_count: 1,
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        estimated_cost: cost_yuan,
        details: {
          user_id,
          conversation_id,
          bot_type,
          model,
          call_type,
        },
      }),
    });
  } catch (err) {
    // 静默失败：成本记录不影响主流程
    console.error('[cost] Failed to track cost:', err);
  }
}

/**
 * 从 DeepSeek API 非流式响应中提取 usage
 */
export function extractUsageFromResponse(data: any): UsageInfo | null {
  if (data?.usage?.prompt_tokens != null) {
    return {
      prompt_tokens: data.usage.prompt_tokens,
      completion_tokens: data.usage.completion_tokens,
      total_tokens: data.usage.total_tokens,
    };
  }
  return null;
}

/**
 * 从流式响应的 buffer 中提取最后一个 SSE 的 usage
 */
export function extractUsageFromStreamBuffer(buffer: string): UsageInfo | null {
  const lines = buffer.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line.startsWith('data: ')) continue;
    if (line === 'data: [DONE]') continue;
    try {
      const data = JSON.parse(line.slice(6));
      if (data?.usage?.prompt_tokens != null) {
        return {
          prompt_tokens: data.usage.prompt_tokens,
          completion_tokens: data.usage.completion_tokens,
          total_tokens: data.usage.total_tokens,
        };
      }
    } catch {
      continue;
    }
  }
  return null;
}
