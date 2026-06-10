
import { NextRequest, NextResponse } from 'next/server';
import { deepSeekChat, ChatMessage } from '@/lib/deepseek-chat';
import { trackCost } from '@/lib/cost-tracker';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `你叫小职，是用户的简历助手。你的角色是"帮用户写简历的朋友"——亲切但不啰嗦，有专业度但不居高临下。

【你的任务】
通过与用户的自然对话，逐步收集简历所需的所有信息，然后提取关键内容更新到对应字段。

【基本原则】
1. 一次只问1-2个问题，不要一次性问太多
2. 用户回答后，先确认理解，再提取信息
3. 追问具体的、可量化的成果
4. 不要编造用户没说的信息
5. 每轮只输出 JSON，不要有多余文字

【信息收集顺序】
Step 1-基本信息：姓名、学校/专业、学历、毕业时间、联系方式、求职方向
Step 2-教育经历：学历、学校、专业、GPA、荣誉（可选）
Step 3-项目经历（核心差异）：问用户"大学最得意的项目"，帮拆解成项目名称、角色、技术、成果
Step 4-工作/实习经历：公司、岗位、时间、工作内容、成果
Step 5-技能证书：技能名称、等级、证书名称

【输出格式】
你必须严格按照以下 JSON 格式输出，不要包含任何其他文字：
{
  "reply": "你回复用户的话",
  "updates": { "字段路径": "值" },
  "progress": 当前进度百分比(0-100)
}

字段路径格式：
- basic.title, basic.summary, basic.name 等
- education: [{ id, school, major, degree, startDate, endDate, gpa }]
- experience: [{ id, company, position, startDate, endDate, current, description, achievements }]
- projects: [{ id, name, role, startDate, endDate, description, link, technologies }]
- skills: [{ id, name, level (beginner/intermediate/advanced/expert), category }]
- certifications: [{ id, name, issuer, date }]

当用户说"我不知道"或"没什么特别"时，reply 要温和引导，不要强迫。`;

/**
 * 从 DeepSeek 返回的文本中安全提取 JSON 对象。
 * 处理可能被 Markdown 代码块包裹的情况。
 */
function parseJsonResponse(text: string): Record<string, unknown> {
  const trimmed = text.trim();

  // 尝试直接解析
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    // 继续尝试从 markdown 代码块中提取
  }

  // 移除 ```json ... ``` 包裹
  const jsonBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    try {
      return JSON.parse(jsonBlockMatch[1].trim()) as Record<string, unknown>;
    } catch {
      // 继续尝试
    }
  }

  // 尝试提取最外层的 {} 包裹的内容
  const braceMatch = trimmed.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try {
      return JSON.parse(braceMatch[0]) as Record<string, unknown>;
    } catch {
      throw new Error('Failed to parse AI response as JSON');
    }
  }

  throw new Error('Failed to parse AI response as JSON');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, collectedFields } = body as {
      messages: ChatMessage[];
      collectedFields: Record<string, unknown>;
    };

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'messages is required and must be an array' },
        { status: 400 }
      );
    }

    // 构建系统消息：将当前已收集的字段作为上下文附加到 system prompt
    const systemMessage: ChatMessage = {
      role: 'system',
      content: `${SYSTEM_PROMPT}\n\n当前已收集的字段:\n${JSON.stringify(collectedFields, null, 2)}`,
    };

    // 过滤掉客户端传来的 system 消息，使用我们自己的
    const userMessages = messages.filter((m) => m.role !== 'system');
    const fullMessages = [systemMessage, ...userMessages];

    // 调用 DeepSeek（非流式，返回含 usage 的结果）
    const result = await deepSeekChat({
      messages: fullMessages,
      temperature: 0.7,
      maxTokens: 2048,
      returnUsage: true,
    } as { messages: ChatMessage[]; temperature: number; maxTokens: number; returnUsage: true });

    // 记录成本
    if (result.usage) {
      trackCost({
        bot_type: 'resume_conversation',
        model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
        call_type: 'chat',
        usage: result.usage,
      }).catch(() => {
        // 静默失败
      });
    }

    // 解析响应 JSON
    const parsed = parseJsonResponse(result.content);
    const reply = typeof parsed.reply === 'string' ? parsed.reply : '';
    const updates = (parsed.updates as Record<string, unknown>) || {};
    const progress =
      typeof parsed.progress === 'number'
        ? parsed.progress
        : typeof parsed.progress === 'string'
          ? parseInt(parsed.progress, 10) || 0
          : 0;

    return NextResponse.json({
      reply,
      updates,
      progress,
    });
  } catch (error) {
    console.error('简历对话 API 错误:', error);
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
