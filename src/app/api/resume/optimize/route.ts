import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUserId } from '@/lib/auth';
import { deepSeekChat } from '@/lib/deepseek-chat';
export const dynamic = 'force-dynamic';

const supabase = getSupabaseAdmin();

interface Suggestion {
  type: 'highlight' | 'improvement' | 'suggestion';
  title: string;
  suggestion: string;
}

function buildSystemPrompt(targetPosition: string): string {
  return `你是资深HR简历优化专家。用户上传了一份简历，目标是「${targetPosition}」岗位。

请按以下结构输出优化建议（严格JSON数组格式，不要markdown代码块）：

[
  {"type":"highlight","title":"简短标题","suggestion":"详细说明"},
  {"type":"improvement","title":"简短标题","suggestion":"详细说明"},
  {"type":"suggestion","title":"简短标题","suggestion":"详细说明"}
]

规则：
- highlight：简历中写得好的亮点，值得保留和强化（1-2条）
- improvement：必须修改的硬伤——用词空洞、缺乏数据、STAR不完整、格式问题等（3-5条）
- suggestion：针对性提升建议——根据目标岗位补充技能、调整侧重点（2-4条）
- 每条建议要具体，指出原文哪里有问题、怎么改，不能泛泛而谈
- 总共输出6-10条
- 只输出JSON数组，不要其他文字`;
}

function parseSuggestions(raw: string): Suggestion[] {
  // 尝试多种方式提取JSON
  const cleaned = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();
  
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return validateSuggestions(parsed);
  } catch {}
  
  // 尝试提取 [...] 部分
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) return validateSuggestions(parsed);
    } catch {}
  }
  
  // 解析失败返回兜底
  return [{
    type: 'suggestion',
    title: 'AI分析完成',
    suggestion: '请查看下方优化后的简历内容，如有疑问可继续修改。\n\n' + raw.slice(0, 1500),
  }];
}

function validateSuggestions(items: unknown[]): Suggestion[] {
  const validTypes = new Set(['highlight', 'improvement', 'suggestion']);
  return items
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => ({
      type: validTypes.has(String(item.type)) ? String(item.type) as Suggestion['type'] : 'suggestion',
      title: String(item.title || item.suggestion || '').slice(0, 60),
      suggestion: String(item.suggestion || item.title || ''),
    }))
    .filter((s) => s.suggestion.length > 0);
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { content, targetPosition } = body;

    if (!content?.trim() || !targetPosition?.trim()) {
      return NextResponse.json({ error: '请提供简历内容和目标岗位' }, { status: 400 });
    }

    if (content.length > 10000) {
      return NextResponse.json({ error: '简历内容过长，请控制在10000字以内' }, { status: 400 });
    }

    // 调用 DeepSeek AI
    const systemPrompt = buildSystemPrompt(targetPosition);
    const userMessage = `目标岗位：${targetPosition}\n\n简历内容：\n${content}`;

    let aiResponse: string;
    try {
      aiResponse = await deepSeekChat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.5,
        maxTokens: 3000,
      });
    } catch (aiError) {
      console.error('[resume optimize] AI call failed:', aiError);
      return NextResponse.json({ error: 'AI服务暂时不可用，请稍后再试' }, { status: 503 });
    }

    const suggestions = parseSuggestions(aiResponse);

    // 保存到数据库
    const { data: optimization, error: dbError } = await supabase
      .from('resume_optimizations')
      .insert({
        user_id: userId,
        target_position: targetPosition,
        suggestions,
        optimized_content: aiResponse,
        status: 'completed',
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (dbError) {
      console.error('[resume optimize] DB save failed:', dbError);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: optimization?.id || crypto.randomUUID(),
        suggestions,
      },
    });
  } catch (error) {
    console.error('[resume optimize] unexpected error:', error);
    return NextResponse.json({ error: '优化失败，请稍后再试' }, { status: 500 });
  }
}
