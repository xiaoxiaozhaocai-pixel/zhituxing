export const runtime = 'nodejs';

/**
 * 独立互动课程路由 — 模块解耦（M2）
 * POST /api/chat/course → 独立课程端点
 * GET /api/chat/course?action=list → 获取课程列表
 */

import { NextRequest, NextResponse } from 'next/server';
import { parseAccessTokenFromCookie } from '@/lib/auth-cookies';
import { detectInjection, createBlockedSSE } from '@/lib/injection-detect';
import { getAvailableCourses, buildCoursePrompt, detectCourseTopic } from '@/lib/course-generator';
import type { CourseTopic } from '@/lib/course-generator';
import { getUserProfileContext } from '@/lib/coze-stream';
import { getSupabaseAdmin } from '@/lib/supabase';
import { createDeepSeekRAGStream } from '@/lib/rag-utils';
export const dynamic = 'force-dynamic';

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
};

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action');
  if (action === 'list') {
    const courses = getAvailableCourses();
    return NextResponse.json({ code: 200, data: { courses } });
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
    const { message, topic } = body;

    const injectionCheck = detectInjection(message || '开始学习', 'career');
    if (injectionCheck.blocked) {
      return new Response(createBlockedSSE(injectionCheck.reason || '消息被安全拦截'), { headers: SSE_HEADERS });
    }

    // 无消息 → 返回课程列表引导
    if (!message || !message.trim()) {
      const courses = getAvailableCourses();
      const list = courses.map((c: { name: string; description: string }) => `- **${c.name}**：${c.description}`).join('\n');
      const guide = `您好！我是小职互动课程系统 📚\n\n当前可学课程：\n${list}\n\n请告诉我想学哪门课～`;
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: guide })}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      });
      return new Response(stream, { headers: SSE_HEADERS });
    }

    // 检测课程主题
    const detectedTopic = detectCourseTopic({ topic: topic as CourseTopic, customPrompt: message });
    let systemPrompt = buildCoursePrompt(detectedTopic, { customPrompt: message });

    // 注入用户上下文（和主路由保持一致）
    const supabase = getSupabaseAdmin();
    try {
      const { data: { user } } = await supabase.auth.getUser(accessToken);
      if (user?.id) {
        const profileCtx = await getUserProfileContext(user.id);
        if (profileCtx) {
          systemPrompt = `【用户背景信息 — 平台自动注入，请直接使用，不要重新询问】\n${profileCtx}\n\n---\n\n${systemPrompt}`;
        }
      }
    } catch (e) {
      console.error('[course] 获取用户上下文失败:', e);
    }

    const encoder = new TextEncoder();
    const dsStream = createDeepSeekRAGStream(systemPrompt, message, []);

    const stream = new ReadableStream({
      async start(controller) {
        const reader = dsStream.getReader();
        const decoder = new TextDecoder();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.includes('[DONE]')) continue;
              if (line.trim()) controller.enqueue(encoder.encode(line + '\n'));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch (err) {
          console.error('[course] Stream error:', err);
        } finally {
          controller.close(); reader.releaseLock();
        }
      },
    });

    return new Response(stream, { headers: SSE_HEADERS });
  } catch (err) {
    console.error('[course] Error:', err);
    return NextResponse.json({ error: '服务器异常' }, { status: 500 });
  }
}
