export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * 独立模拟面试路由 — 模块解耦（M2）
 * POST /api/chat/interview → 独立面试端点
 * GET /api/chat/interview?action=styles → 获取可选风格
 */

import { NextRequest, NextResponse } from 'next/server';
import { parseAccessTokenFromCookie } from '@/lib/auth-cookies';
import { getSupabaseAdmin } from '@/lib/supabase';
import { detectInjection, createBlockedSSE } from '@/lib/injection-detect';
import { INTERVIEW_STYLES, detectStyleSwitch } from '@/lib/interview-styles';
import type { InterviewStyle } from '@/lib/interview-styles';
import { getUserProfileContext } from '@/lib/coze-stream';
import { extractKeywords, createDeepSeekRAGStream } from '@/lib/rag-utils';

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
};

function buildInterviewPrompt(style: InterviewStyle, userContext: string): string {
  const config = INTERVIEW_STYLES[style];
  return `${config.intro}

【你的面试风格】${config.tone}
【面试流程】
1. 先了解用户想面试的岗位和基本情况
2. 按标准面试流程提问（自我介绍→行为面试→情景题→反问环节）
3. 每次提问后等待用户回答，然后追问或点评
4. 用户说"结束面试"或"本尊点评"时，切换到小职本尊模式：
   - 用温和、真诚的语气总结用户的面试表现
   - 指出2-3个做得好的地方
   - 指出2-3个可以改进的地方，给出具体建议
   - 最后鼓励用户，告诉用户接下来可以练什么

${userContext}`;
}

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action');
  if (action === 'styles') {
    return NextResponse.json({
      code: 200,
      data: {
        styles: Object.entries(INTERVIEW_STYLES).map(([key, s]) => ({
          key, name: s.name, emoji: s.emoji, description: s.description,
        })),
      },
    });
  }
  return NextResponse.json({ code: 400, message: 'Invalid action' }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const accessToken = parseAccessTokenFromCookie(request.headers) || request.cookies.get('sb-access-token')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { message, style } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: '消息不能为空' }, { status: 400 });
    }

    const injectionCheck = detectInjection(message, 'interview');
    if (injectionCheck.blocked) {
      return new Response(createBlockedSSE(injectionCheck.reason || '消息被安全拦截'), { headers: SSE_HEADERS });
    }

    // 检测风格切换
    const switchedStyle = detectStyleSwitch(message);
    const resolvedStyle: InterviewStyle = (switchedStyle || style || 'warm') as InterviewStyle;
    if (!INTERVIEW_STYLES[resolvedStyle]) {
      return NextResponse.json({ error: '不支持的面试风格' }, { status: 400 });
    }

    // 获取用户上下文
    const supabase = getSupabaseAdmin();
    let userId: string | null = null;
    try {
      const { data: { user } } = await supabase.auth.getUser(accessToken);
      userId = user?.id || null;
    } catch { /* */ }

    let userContext = '';
    if (userId) {
      userContext = await getUserProfileContext(userId);
      try {
        const { data: resumes } = await supabase
          .from('resume_optimizations').select('result_data')
          .eq('user_id', userId).order('created_at', { ascending: false }).limit(1);
        if (resumes?.length && resumes[0].result_data) {
          const r = typeof resumes[0].result_data === 'string' ? resumes[0].result_data : JSON.stringify(resumes[0].result_data);
          userContext += `\n\n【用户简历】\n${r.slice(0, 1500)}`;
        }
      } catch { /* */ }
    }

    const systemPrompt = buildInterviewPrompt(resolvedStyle, userContext);
    const conversationId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const keywords = extractKeywords(message);
    const encoder = new TextEncoder();

    // 使用 RAG 增强面试
    const dsStream = createDeepSeekRAGStream(systemPrompt, message, []);

    const stream = new ReadableStream({
      async start(controller) {
        const reader = dsStream.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.includes('[DONE]')) continue;
              if (line.trim()) controller.enqueue(encoder.encode(line + '\n'));
              if (line.startsWith('data: ')) {
                try {
                  const d = JSON.parse(line.slice(6));
                  const c = d?.content || d?.choices?.[0]?.delta?.content;
                  if (c) fullResponse += c;
                } catch { /* */ }
              }
            }
          }
          controller.enqueue(encoder.encode(`event: conversation_id\ndata: ${JSON.stringify({ conversation_id: conversationId })}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch (err) {
          console.error('[interview] Stream error:', err);
        } finally {
          controller.close(); reader.releaseLock();
        }
        if (fullResponse && userId) {
          try {
            await supabase.from('chat_history').insert([
              { conversation_id: conversationId, user_id: userId, role: 'user', content: message, bot_type: 'interview' },
              { conversation_id: conversationId, user_id: userId, role: 'assistant', content: fullResponse, bot_type: 'interview' },
            ]);
          } catch { /* */ }
        }
      },
    });

    return new Response(stream, { headers: SSE_HEADERS });
  } catch (err) {
    console.error('[interview] Error:', err);
    return NextResponse.json({ error: '服务器异常' }, { status: 500 });
  }
}
