import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const { message, conversationId } = await request.json();

    const apiKey = process.env.COZE_API_KEY || '';
    const botId = process.env.COZE_BOT_ID || '';

    if (!apiKey || !botId) {
      // 如果没有配置API密钥，返回一个友好的错误
      return new Response(
        JSON.stringify({ 
          error: '智能体配置中，请联系管理员设置COZE_API_KEY和COZE_BOT_ID环境变量',
          fallback: true 
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const response = await fetch('https://api.coze.cn/v1/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bot_id: botId,
        conversation_id: conversationId,
        stream: true,
        auto_save_history: true,
        additional_messages: [
          {
            role: 'user',
            content: message,
            content_type: 'text',
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Coze API error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Coze API Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to connect to AI assistant',
        fallback: true 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
