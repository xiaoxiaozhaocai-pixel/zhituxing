export const dynamic = 'force-dynamic';
/**
 * 互动课程 API — 小职根据用户进度现讲
 * 
 * POST: 开始/继续课程（DeepSeek SSE 流式）
 * GET: 获取可用课程列表
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserInfoFromRequest } from '@/lib/coze-stream';
import { createDeepSeekRAGStream } from '@/lib/rag-utils';
import {
  type   detectCourseTopic,
  buildCoursePrompt,
  getAvailableCourses,
} from '@/lib/course-generator';

export const runtime = 'nodejs';

const USE_DEEPSEEK = process.env.DEEPSEEK_ENABLED === 'true';

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
  'X-Accel-Buffering': 'no',
};

// POST: 生成/继续课程
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, topic: reqTopic, userContext, customPrompt, history } = body;

    // 检测最佳课程主题
    const topic = detectCourseTopic({ topic: reqTopic, userContext, customPrompt });

    // 构建课程提示词
    const systemPrompt = buildCoursePrompt(topic, { topic, userContext, customPrompt });

    if (USE_DEEPSEEK) {
      console.log(`[courses] Using DeepSeek for topic: ${topic}`);
      const stream = createDeepSeekRAGStream(systemPrompt, message || '开始上课吧', history || []);
      return new Response(stream, { headers: SSE_HEADERS });
    }

    // fallback
    return NextResponse.json({
      code: 200,
      data: {
        topic,
        message: '课程系统准备就绪。DeepSeek 未启用时返回此提示。',
      },
    });
  } catch (error) {
    console.error('[courses] Error:', error);
    return NextResponse.json({ error: '课程生成失败' }, { status: 500 });
  }
}

// GET: 获取可用课程列表
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'list') {
    return NextResponse.json({
      code: 200,
      data: {
        courses: getAvailableCourses(),
        defaultTopic: 'star',
      },
    });
  }

  // 获取用户信息（用于自动推荐课程）
  const userInfo = await getUserInfoFromRequest(request);
  const userId = userInfo?.userId || null;

  return NextResponse.json({
    code: 200,
    data: {
      courses: getAvailableCourses(),
      recommendedTopic: 'star',
      userId,
    },
  });
}
