/**
 * 能力翻译核心逻辑 — /api/resume/translate 与 chat 工具执行器（方向四）共用
 * 行为与原 route 实现保持一致，仅做位置抽离，便于复用。
 */

import { deepSeekChat, ChatMessage } from '@/lib/deepseek-chat';

export interface TranslateExperienceResult {
  original: string;
  translated: string;
  gaps: string[];
}

const SYSTEM_PROMPT = `你是一位专业的简历优化顾问。你的任务是将用户的口语化/日常化经历描述，改写成专业的简历语言（JD语言）。

要求：
1. 使用主动动词开头（如"主导"、"负责"、"实现"、"优化"、"推动"等）
2. 尽量量化成果（用数字、百分比等具体数据）
3. 保持简洁有力，每条描述控制在15-30字
4. 突出个人贡献和影响力，而非团队
5. 使用行业通用术语

请严格按照以下 JSON 格式回复，不要包含其他文字：
{
  "translated": "改写后的专业描述（如果是多条经历，用\\n分隔）",
  "gaps": ["建议补充的能力点1", "建议补充的能力点2"]
}

translated 字段是改写后的专业简历用语。
gaps 字段是从这段经历中看出的、用户应该补充或突出的能力短板（1-3条）。`;

export async function translateExperience(
  experience: string,
  targetIndustry?: string
): Promise<TranslateExperienceResult> {
  const industryContext = targetIndustry
    ? `\n目标行业：${targetIndustry}\n请使用该行业的专业术语和表达方式。`
    : '';

  const messages: ChatMessage[] = [
    { role: 'system', content: `${SYSTEM_PROMPT}${industryContext}` },
    { role: 'user', content: experience.trim() },
  ];

  const result = await deepSeekChat({
    messages,
    temperature: 0.3,
    maxTokens: 2048,
    returnUsage: true,
  });

  if (!result.content) {
    throw new Error('AI服务返回为空，请重试');
  }

  // 解析 LLM 返回（与原 route 相同的多重容错）
  let cleaned = result.content.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
  cleaned = cleaned.replace(/```\s*$/, '');
  cleaned = cleaned.trim();

  let parsed: { translated?: string; gaps?: string[] };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // 尝试修复尾逗号
    parsed = JSON.parse(cleaned.replace(/,\s*([}\]])/g, '$1'));
  }

  return {
    original: experience,
    translated: parsed.translated || '',
    gaps: parsed.gaps || [],
  };
}
