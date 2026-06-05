export const dynamic = 'force-dynamic';
/**
 * 职搭子AI智能体流式API
 * 调用DeepSeek API，通过RAG检索相关JD，返回流式响应
 */

import { NextRequest, NextResponse } from 'next/server';
import { createDeepSeekSSEStream } from '@/lib/deepseek-chat';
import { searchRelevantJDs, buildJDAssistantPrompt } from '@/lib/jd-rag';
import type { ChatMessage } from '@/lib/types';

// 流式对话
export async function POST(request: NextRequest) {
  try {
    const USE_DEEPSEEK = process.env.DEEPSEEK_ENABLED === 'true';
    
    // DeepSeek 未启用时直接返回错误
    if (!USE_DEEPSEEK) {
      return NextResponse.json(
        { code: 500, message: 'DeepSeek 未启用，请在环境变量中设置 DEEPSEEK_ENABLED=true' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { message, messages } = body;

    // 参数校验
    const lastUserMsg = messages?.filter((m: ChatMessage) => m.role === 'user').pop()?.content || message || '';
    if (!lastUserMsg) {
      return NextResponse.json(
        { code: 400, message: '消息内容不能为空' },
        { status: 400 }
      );
    }

    try {
      // RAG检索相关JD
      const ragContext = await searchRelevantJDs(lastUserMsg);
      const systemPrompt = buildJDAssistantPrompt(ragContext);
      
      // 构建DeepSeek消息列表
      const chatMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...(messages || []).filter((m: ChatMessage) => m.role !== 'system')
      ];
      
      // 返回DeepSeek SSE流
      const stream = createDeepSeekSSEStream({ messages: chatMessages });
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } catch (error) {
      console.error('DeepSeek chat error:', error);
      return NextResponse.json(
        { code: 500, message: 'AI 服务暂时不可用', error: error instanceof Error ? error.message : '未知错误' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('职搭子对话失败:', error);
    return NextResponse.json(
      { code: 500, message: '服务暂时不可用', error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}

// 获取会话历史（DeepSeek 模式不支持）
export async function GET() {
  return NextResponse.json(
    { code: 404, message: 'DeepSeek 模式不支持会话历史查询' },
    { status: 404 }
  );
}
