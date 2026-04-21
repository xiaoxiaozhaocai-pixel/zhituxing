import { NextRequest, NextResponse } from 'next/server';
import { deductQuota, getRemainingQuota, getUserQuota } from '@/lib/quota';
import { execSql } from '@/lib/exec-sql';

export const runtime = 'edge';

// 智能体路由选择
function selectBotId(message: string, botType?: string): string {
  const jobsBotId = process.env.COZE_BOT_ID_JOBS || '7629654356933050409';
  const interviewBotId = process.env.COZE_BOT_ID_INTERVIEW || '7622676506535788607';
  
  // 如果指定了bot类型，直接使用
  if (botType === 'jobs') return jobsBotId;
  if (botType === 'interview') return interviewBotId;
  if (botType === 'career') {
    // 职业生涯规划智能体（预留，待配置）
    return jobsBotId; // 暂时回退到岗位百科
  }
  
  const messageLower = message.toLowerCase();
  
  // 模拟面试相关问题 -> 模拟面试官
  if (
    messageLower.includes('模拟面试') ||
    messageLower.includes('面试') ||
    messageLower.includes('面经') ||
    messageLower.includes('面试题')
  ) {
    return interviewBotId;
  }
  
  // 职业规划相关 -> 职业生涯规划（预留）
  if (
    messageLower.includes('职业规划') ||
    messageLower.includes('考研') ||
    messageLower.includes('就业') ||
    messageLower.includes('适合什么')
  ) {
    // 暂时回退到岗位百科，待职业生涯规划智能体接入
    return jobsBotId;
  }
  
  // 默认使用岗位百科智能体
  return jobsBotId;
}

// 获取用户ID（从请求头）
async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const userId = request.headers.get('x-user-id');
  if (!userId) return null;
  
  // 验证用户是否存在
  const result = await execSql(`SELECT id FROM users WHERE id = '${userId}' LIMIT 1`);
  if (!result || result.length === 0) return null;
  
  return userId;
}

export async function POST(request: NextRequest) {
  try {
    const { message, conversationId, botType } = await request.json();
    
    // 获取用户ID
    const userId = await getUserIdFromRequest(request);
    
    // 已登录用户需要扣减配额
    if (userId) {
      const quotaResult = await deductQuota(userId);
      
      if (!quotaResult.success) {
        // 配额不足，返回错误
        return new Response(
          JSON.stringify({ 
            error: 'quota_exceeded',
            message: quotaResult.reason || '配额不足'
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      
      // 获取当前剩余配额
      const remaining = await getRemainingQuota(userId);
      
      // 在响应头中返回剩余配额
      // 注意：SSE流式响应中无法直接修改响应头，需要在响应体中传递
    }
    
    const apiKey = process.env.COZE_API_KEY;
    const botId = selectBotId(message, botType);

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

    // 调用扣子API
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

    // 获取用户当前配额信息
    let quotaInfo = { remaining: -1, isMember: false };
    if (userId) {
      const member = await getUserQuota(userId);
      quotaInfo = {
        remaining: member?.monthly_quota ?? 0,
        isMember: member?.member_type !== 'free' && member?.member_expire_time && new Date(member.member_expire_time) > new Date()
      };
    }

    // 流式响应
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        
        if (!reader) {
          controller.close();
          return;
        }
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            controller.enqueue(value);
          }
        } finally {
          reader.releaseLock();
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Quota-Remaining': String(quotaInfo.remaining),
        'X-Is-Member': String(quotaInfo.isMember),
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
