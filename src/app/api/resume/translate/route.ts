export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { deepSeekChat, ChatMessage } from '@/lib/deepseek-chat';

interface TranslateRequest {
  experience: string;
  target_industry?: string;
}

interface TranslateResponse {
  original: string;
  translated: string;
  gaps: string[];
}

/**
 * POST /api/resume/translate
 * 将口语化的经历描述翻译为专业简历用语（JD语言）
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body: TranslateRequest = await request.json();
    const { experience, target_industry } = body;

    if (!experience || experience.trim().length === 0) {
      return NextResponse.json(
        { error: '经历描述是必填项' },
        { status: 400 }
      );
    }

    const industryContext = target_industry
      ? `目标行业：${target_industry}\n请使用该行业的专业术语和表达方式。`
      : '';

    const systemPrompt = `你是一位专业的简历优化顾问。你的任务是将用户的口语化/日常化经历描述，改写成专业的简历语言（JD语言）。

要求：
1. 使用主动动词开头（如"主导"、"负责"、"实现"、"优化"、"推动"等）
2. 尽量量化成果（用数字、百分比等具体数据）
3. 保持简洁有力，每条描述控制在15-30字
4. 突出个人贡献和影响力，而非团队
5. 使用行业通用术语
${industryContext}

请严格按照以下 JSON 格式回复，不要包含其他文字：
{
  "translated": "改写后的专业描述（如果是多条经历，用\\n分隔）",
  "gaps": ["建议补充的能力点1", "建议补充的能力点2"]
}

translated 字段是改写后的专业简历用语。
gaps 字段是从这段经历中看出的、用户应该补充或突出的能力短板（1-3条）。`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: experience.trim() },
    ];

    const result = await deepSeekChat({
      messages,
      temperature: 0.3,
      maxTokens: 2048,
      returnUsage: true,
    });

    if (!result.content) {
      return NextResponse.json(
        { error: 'AI服务返回为空，请重试' },
        { status: 500 }
      );
    }

    // 解析 LLM 返回
    let cleaned = result.content.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
    cleaned = cleaned.replace(/```\s*$/, '');
    cleaned = cleaned.trim();

    let parsed: { translated: string; gaps: string[] };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // 尝试修复尾逗号
      try {
        parsed = JSON.parse(cleaned.replace(/,\s*([}\]])/g, '$1'));
      } catch {
        console.error('[resume-translate] Failed to parse LLM response:', cleaned);
        return NextResponse.json(
          { error: 'AI分析结果解析失败' },
          { status: 500 }
        );
      }
    }

    const data: TranslateResponse = {
      original: experience,
      translated: parsed.translated || '',
      gaps: parsed.gaps || [],
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[resume-translate] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : '翻译异常';

    if (errorMessage.includes('DeepSeek API')) {
      return NextResponse.json(
        { error: 'AI翻译服务暂时不可用，请稍后重试' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: '能力翻译异常' },
      { status: 500 }
    );
  }
}
