export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * 独立模拟面试路由 — 模块解耦（M2）
 * 
 * 可直接通过 POST /api/chat/interview 调用，不经过主 /api/chat 调度。
 * 使用 interview-styles 系统，支持三风格（温和/严格/压力）+ 本尊点评。
 * 
 * 与旧路由并存：旧 POST /api/chat?botType=interview 仍然可用。
 */

import { NextRequest, NextResponse } from 'next/server';
import { parseAccessTokenFromCookie } from '@/lib/auth-cookies';
import { getSupabaseAdmin } from '@/lib/supabase';
import { detectInjection, createBlockedSSE } from '@/lib/injection-detect';
import { INTERVIEW_STYLES, buildInterviewSystemPrompt, detectStyle } from '@/lib/interview-styles';
import { getUserProfileContext } from '@/lib/coze-stream';
import { prepareChatContext } from '@/app/api/chat/chat-context';
import { SYSTEM_PROMPTS } from '@/app/api/chat/prompts';
import { createDeepSeekRAGStream } from '@/lib/rag-utils';

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
};

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action');
  
  if (action === 'styles') {
    return NextResponse.json({
      code: 200,
      data: {
        styles: Object.entries(INTERVIEW_STYLES).map(([key, s]) => ({
          key,
          name: s.name,
          description: s.description,
        })),
      },
    });
  }

  return NextResponse.json({ code: 400, message: 'Invalid action' }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    // 认证
    const accessToken = parseAccessTokenFromCookie(request.headers) || request.cookies.get('sb-access-token')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { message, style } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: '消息不能为空' }, { status: 400 });
    }

    // 注入检测
    const injectionCheck = detectInjection(message, 'interview');
    if (injectionCheck.blocked) {
      return new Response(createBlockedSSE(injectionCheck.reason || '消息被安全拦截'), { headers: SSE_HEADERS });
    }

    // 检测面试风格
    const resolvedStyle = detectStyle(style || 'warm', message);

    // 构建面试系统提示词
    const basePrompt = buildInterviewSystemPrompt(resolvedStyle);

    // 获取用户上下文
    const supabase = getSupabaseAdmin();
    let userId: string | null = null;
    try {
      const { data: { user } } = await supabase.auth.getUser(accessToken);
      userId = user?.id || null;
    } catch { /* auth error */ }

    let userContext = '';
    if (userId) {
      userContext = await getUserProfileContext(userId);
      
      // 上游产物注入：简历优化结果
      try {
        const { data: resumes } = await supabase
          .from('resume_optimizations')
          .select('result_data')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1);
        if (resumes?.length && resumes[0].result_data) {
          const r = typeof resumes[0].result_data === 'string' ? resumes[0].result_data : JSON.stringify(resumes[0].result_data);
          userContext += `\n\n【简历信息】\n${r.slice(0, 1500)}`;
        }
      } catch { /* ignore */ }
    }

    const fullSystemPrompt = basePrompt + (userContext ? `\n\n---\n用户信息：\n${userContext}` : '');

    // 流式响应
    const encoder = new TextEncoder();
    const conversationId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    const dsStream = createDeepSeekRAGStream(fullSystemPrompt, message, []);

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
                  const data = JSON.parse(line.slice(6));
                  const content = data?.content || data?.choices?.[0]?.delta?.content;
                  if (content) fullResponse += content;
                } catch { /* */ }
              }
            }
          }
          controller.enqueue(encoder.encode(`event: conversation_id\ndata: ${JSON.stringify({ conversation_id: conversationId })}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch (err) {
          console.error('[interview] Stream error:', err);
        } finally {
          controller.close();
          reader.releaseLock();
        }

        // 异步保存历史
        if (fullResponse && userId) {
          try {
            await supabase.from('chat_history').insert([
              { conversation_id: conversationId, user_id: userId, role: 'user', content: message, bot_type: 'interview' },
              { conversation_id: conversationId, user_id: userId, role: 'assistant', content: fullResponse, bot_type: 'interview' },
            ]);
          } catch { /* ignore */ }
        }
      },
    });

    return new Response(stream, { headers: SSE_HEADERS });
  } catch (err) {
    console.error('[interview] Error:', err);
    return NextResponse.json({ error: '服务器异常' }, { status: 500 });
  }
}
