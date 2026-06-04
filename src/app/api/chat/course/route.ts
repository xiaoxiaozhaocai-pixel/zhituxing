export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * 独立互动课程路由 — 模块解耦（M2）
 * 
 * 可直接通过 POST /api/chat/course 调用，不经过主 /api/chat 调度。
 * 使用 course-generator 系统，支持5大课程主题 + SSE流式生成。
 * 
 * 与旧路由并存：旧 POST /api/chat?botType=course 仍然可用。
 */

import { NextRequest, NextResponse } from 'next/server';
import { parseAccessTokenFromCookie } from '@/lib/auth-cookies';
import { detectInjection, createBlockedSSE } from '@/lib/injection-detect';
import { COURSES, generateCourseStream } from '@/lib/course-generator';

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
};

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action');

  if (action === 'list') {
    return NextResponse.json({
      code: 200,
      data: {
        courses: COURSES.map(c => ({
          id: c.id,
          title: c.title,
          description: c.description,
          duration: c.duration,
          category: c.category,
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
    const { message, courseId } = body;

    // 注入检测
    const injectionCheck = detectInjection(message || '', 'career');
    if (injectionCheck.blocked) {
      return new Response(createBlockedSSE(injectionCheck.reason || '消息被安全拦截'), { headers: SSE_HEADERS });
    }

    // 如果指定了 courseId，生成该课程
    if (courseId) {
      const course = COURSES.find(c => c.id === courseId);
      if (!course) {
        return NextResponse.json({ error: '课程不存在' }, { status: 404 });
      }

      const dsStream = await generateCourseStream(course, message || '开始学习');

      const encoder = new TextEncoder();
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
            controller.close();
            reader.releaseLock();
          }
        },
      });

      return new Response(stream, { headers: SSE_HEADERS });
    }

    // 无 message，返回课程列表引导
    const encoder = new TextEncoder();
    const courseList = COURSES.map(c => `- **${c.title}**：${c.description}（${c.duration}）`).join('\n');
    const guideMsg = `您好！我是小职互动课程系统 📚\n\n当前可学课程：\n${courseList}\n\n请告诉我想学哪门课，比如"我想学STAR法则"～`;
    
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: guideMsg })}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(stream, { headers: SSE_HEADERS });
  } catch (err) {
    console.error('[course] Error:', err);
    return NextResponse.json({ error: '服务器异常' }, { status: 500 });
  }
}
