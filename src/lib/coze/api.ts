/**
 * Coze API 调用模块
 * 提供 Coze workflow stream API 和 Coze v3 chat API 调用
 */

import { getWorkflowConfig } from './config';

/**
 * 调用扣子编程 stream_run API
 */
export async function callWorkflowStreamApi(params: {
  botType: string;
  message: string;
  userContext?: string;
}): Promise<Response> {
  const config = getWorkflowConfig(params.botType);
  if (!config) {
    throw new Error(`No workflow config found for botType: ${params.botType}`);
  }

  const finalMessage = (params.userContext || '') + params.message;
  const sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        content: {
          query: {
            prompt: [
              {
                type: 'text',
                content: {
                  text: finalMessage,
                },
              },
            ],
          },
        },
        type: 'query',
        session_id: sessionId,
        project_id: config.projectId,
      }),
      signal: controller.signal,
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/event-stream') && response.ok) {
      const body = await response.text();
      let errorMsg = `AI服务返回了非预期的响应格式`;
      try {
        const errorJson = JSON.parse(body);
        errorMsg = errorJson.msg || errorJson.message || errorJson.error || errorMsg;
      } catch { /* use default */ }
      throw new Error(errorMsg);
    }

    if (!response.ok) {
      let errorMsg = `AI服务请求失败(HTTP ${response.status})`;
      try {
        const errorBody = await response.text();
        const errorJson = JSON.parse(errorBody);
        errorMsg = errorJson.msg || errorJson.message || errorJson.error || errorMsg;
      } catch { /* use default */ }
      throw new Error(errorMsg);
    }

    return response;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * 调用 Coze API v3 chat 流式请求
 */
export async function callCozeStreamApi(params: {
  botId: string;
  message: string;
  userType: string;
  conversationId?: string;
  userContext?: string;
}): Promise<Response> {
  const finalMessage = (params.userContext || '') + params.message;

  return fetch('https://api.coze.cn/v3/chat', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.COZE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      bot_id: params.botId,
      conversation_id: params.conversationId || '',
      stream: true,
      auto_save_history: true,
      custom_variables: {
        user_type: params.userType || 'free',
      },
      additional_messages: [
        {
          role: 'user',
          content: finalMessage,
          content_type: 'text',
        },
      ],
    }),
  });
}
