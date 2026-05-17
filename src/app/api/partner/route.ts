/**
 * 职搭子AI智能体流式API
 * 调用Coze平台职搭子智能体，通过SSE协议返回流式响应
 * 
 * API文档: https://www.coze.cn/docs/developer_guides/coze_api/
 */

import { NextRequest, NextResponse } from 'next/server';

// Coze API 配置
const COZE_API_URL = 'https://api.coze.cn/open_api/v2/chat';
const COZE_API_TOKEN = process.env.COZE_API_TOKEN || '';
const BOT_ID = process.env.COZE_BOT_JD_ASSISTANT || process.env.COZE_BOT_ID || '';

// 生成用户ID（简化版，实际应从session获取）
function getUserId(request: NextRequest): string {
  return request.headers.get('x-user-id') || 'anonymous_user';
}

// 流式对话
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, sessionId } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { code: 400, message: '消息内容不能为空' },
        { status: 400 }
      );
    }

    // 调用Coze API
    const response = await fetch(COZE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${COZE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bot_id: BOT_ID,
        user: getUserId(request),
        query: message,
        stream: true,
        conversation_id: sessionId || undefined,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Coze API请求失败:', response.status, errorText);
      return NextResponse.json(
        { code: response.status, message: `API请求失败: ${response.status}` },
        { status: response.status }
      );
    }

    // 返回流式响应
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('职搭子对话失败:', error);
    return NextResponse.json(
      { code: 500, message: '服务暂时不可用', error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}

// 获取会话历史（可选）
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get('conversation_id');

  if (!conversationId) {
    return NextResponse.json(
      { code: 400, message: '需要conversation_id参数' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(`${COZE_API_URL}/retrieve?conversation_id=${conversationId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${COZE_API_TOKEN}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      return NextResponse.json(
        { code: response.status, message: '获取会话历史失败' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('获取会话历史失败:', error);
    return NextResponse.json(
      { code: 500, message: '服务暂时不可用' },
      { status: 500 }
    );
  }
}
