import { NextRequest } from 'next/server';

export const runtime = 'edge';

function selectBotId(message: string): string {
  const jobsBotId = process.env.COZE_BOT_ID_JOBS || '7629654356933050409';
  const interviewBotId = process.env.COZE_BOT_ID_INTERVIEW || '7622676506535788607';
  
  const messageLower = message.toLowerCase();
  
  // 模拟面试相关问题
  if (
    messageLower.includes('模拟面试') ||
    messageLower.includes('面试') ||
    messageLower.includes('面经')
  ) {
    return interviewBotId;
  }
  
  // 默认使用岗位百科智能体
  return jobsBotId;
}

export async function POST(request: NextRequest) {
  try {
    const { message, conversationId } = await request.json();

    const apiKey = process.env.COZE_API_KEY;
    const botId = selectBotId(message);

    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          error: '请设置COZE_API_KEY环境变量' 
        }),
        {
          status: 500,
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
        conversation_id: conversationId || '',
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
      const errorText = await response.text();
      console.error('Coze API Error:', response.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: `API调用失败: ${response.status}`,
          details: errorText 
        }),
        {
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to connect to AI assistant' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
