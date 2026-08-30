import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { deepSeekChat, ChatMessage } from '@/lib/deepseek-chat';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RefineRequestBody {
  suggestionTitle: string;
  suggestionContent: string;
  suggestionType?: 'highlight' | 'improvement' | 'suggestion';
  originalContent: string;
  targetPosition: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

function buildSystemPrompt(p: {
  targetPosition: string;
  originalContent: string;
  suggestionTitle: string;
  suggestionContent: string;
  suggestionType?: string;
}): string {
  const truncated = (p.originalContent || '').slice(0, 2000);
  const typeLabel =
    p.suggestionType === 'highlight'
      ? '亮点（值得保留强化）'
      : p.suggestionType === 'improvement'
        ? '硬伤（必须修改）'
        : '建议（针对性提升）';

  return `你是小职——一位懂桂电学生的简历优化教练。用户正在针对一条优化建议追问深聊，帮他把建议落地成可直接写进简历的内容。

【当前讨论】
- 目标岗位：${p.targetPosition}
- 建议类型：${typeLabel}
- 建议标题：「${p.suggestionTitle}」
- 建议详情：${p.suggestionContent}

【简历原文节选】
"""
${truncated}
"""

【你的回答风格】
- 像朋友，亲切但专业，不说官话套话
- 1-3 段精炼回答，正文一般不超过 200 字
- 引用简历内容要点出具体段落或关键词
- 禁止编造用户没写的经历/数据/项目，只在用户原文基础上提建议

【改写片段（重要）】
当用户问"具体怎么改"/"举例子"/"帮我改写"/"给一句话版本"等需要直接产出文案时，必须给出 1 段可直接复制到简历的改写文本，并用如下格式包裹（前端会高亮成「一键复制」卡片）：

\`\`\`改写
（这里写改写后的简历段落原文，带数据/STAR/动词，绝不空话）
\`\`\`

普通讨论/解释/答疑时不需要给改写片段。

【输出格式】
- 正文用 Markdown
- 改写片段必须用 \`\`\`改写 ... \`\`\` 三反引号包裹
- 不要任何其他多余的元信息包装`;
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = (await request.json()) as RefineRequestBody;
    const {
      suggestionTitle,
      suggestionContent,
      suggestionType,
      originalContent,
      targetPosition,
      messages,
    } = body;

    if (!suggestionTitle || !suggestionContent || !targetPosition) {
      return NextResponse.json(
        { error: '缺少必要参数（suggestionTitle / suggestionContent / targetPosition）' },
        { status: 400 }
      );
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages 必须是非空数组' }, { status: 400 });
    }

    if (messages.length > 30) {
      return NextResponse.json(
        { error: '对话历史过长，请新开一轮深聊' },
        { status: 400 }
      );
    }

    const systemPrompt = buildSystemPrompt({
      targetPosition,
      originalContent: originalContent || '',
      suggestionTitle,
      suggestionContent,
      suggestionType,
    });

    const chatMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: String(m.content || '').slice(0, 3000),
      })),
    ];

    const reply = await deepSeekChat({
      messages: chatMessages,
      temperature: 0.6,
      maxTokens: 800,
    });

    // 提取改写片段（```改写 ... ```）
    const rewriteMatch = reply.match(/```改写\s*([\s\S]*?)```/);
    const rewriteSnippet = rewriteMatch ? rewriteMatch[1].trim() : null;

    return NextResponse.json({
      success: true,
      data: {
        reply,
        rewriteSnippet,
      },
    });
  } catch (error) {
    console.error('[resume refine] error:', error);
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
