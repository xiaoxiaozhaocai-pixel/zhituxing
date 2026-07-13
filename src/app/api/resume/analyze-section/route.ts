/**
 * 简历逐段分析 API — DeepSeek 直连，2-4s 响应
 * POST /api/resume/analyze-section
 * Body: { sectionType, sectionText, resumeContext? }
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { LLM_BASE_URL } from '@/lib/llm-router';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;
const DEEPSEEK_MODEL = process.env.MODEL || 'deepseek-chat';

const SECTION_PROMPTS: Record<string, string> = {
  education: `你是简历优化专家。分析这段"教育经历"给出精准反馈。
必须返回 JSON 格式（不要markdown包裹）：
{"score":7,"strengths":["优点1"],"weaknesses":["缺点1"],"suggestions":["建议1"],"rewritten":"改写后的完整段落"}`,
  experience: `你是简历优化专家。分析这段"实习/工作经历"给出精准反馈。
重点看：STAR法则（情境-任务-行动-结果）、量化成果、关键词密度。
必须返回 JSON 格式（不要markdown包裹）：
{"score":7,"strengths":["优点1"],"weaknesses":["缺点1"],"suggestions":["建议1"],"rewritten":"改写后的完整段落"}`,
  projects: `你是简历优化专家。分析这段"项目经历"给出精准反馈。
重点看：技术栈完整性、项目影响力、个人贡献明确度。
必须返回 JSON 格式（不要markdown包裹）：
{"score":7,"strengths":["优点1"],"weaknesses":["缺点1"],"suggestions":["建议1"],"rewritten":"改写后的完整段落"}`,
  skills: `你是简历优化专家。分析这段"技能标签"给出精准反馈。
重点看：技能分类合理性、与目标岗位匹配度、硬技能vs软技能比例。
必须返回 JSON 格式（不要markdown包裹）：
{"score":7,"strengths":["优点1"],"weaknesses":["缺点1"],"suggestions":["建议1"],"rewritten":"优化后的技能列表"}`,
  default: `你是简历优化专家。分析这段简历内容给出精准反馈。
必须返回 JSON 格式（不要markdown包裹）：
{"score":7,"strengths":["优点1"],"weaknesses":["缺点1"],"suggestions":["建议1"],"rewritten":"改写后的版本"}`,
};

export async function POST(request: Request) {
  try {
    const { sectionType, sectionText, resumeContext } = await request.json();

    if (!sectionText || !sectionText.trim()) {
      return Response.json({ error: '请选择要分析的简历段落' }, { status: 400 });
    }

    const prompt = SECTION_PROMPTS[sectionType] || SECTION_PROMPTS.default;
    const contextHint = resumeContext
      ? `\n\n简历整体上下文供参考：\n${resumeContext.slice(0, 500)}`
      : '';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const resp = await fetch(`${LLM_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: `分析以下简历段落：\n\n${sectionText.slice(0, 1500)}${contextHint}` },
        ],
        temperature: 0.3,
        max_tokens: 600,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!resp.ok) {
      console.error('[analyze-section] DeepSeek error:', resp.status);
      return Response.json({ error: 'AI 分析服务暂不可用' }, { status: 502 });
    }

    const data = await resp.json();
    const raw = data.choices?.[0]?.message?.content || '';

    // 解析 JSON（支持 markdown 包裹）
    let result;
    try {
      const jsonStr = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      result = JSON.parse(jsonStr);
    } catch {
      // 解析失败时返回原始文本
      result = { score: 0, strengths: [], weaknesses: [], suggestions: [raw], rewritten: '' };
    }

    return Response.json({
      score: result.score || 0,
      strengths: result.strengths || [],
      weaknesses: result.weaknesses || [],
      suggestions: result.suggestions || [],
      rewritten: result.rewritten || '',
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return Response.json({ error: '分析超时，请重试' }, { status: 504 });
    }
    console.error('[analyze-section] Error:', err);
    return Response.json({ error: '分析失败' }, { status: 500 });
  }
}
