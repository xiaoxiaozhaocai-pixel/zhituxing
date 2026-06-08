/**
 * DeepSeek 流式聊天封装
 * 用于智能体迁移：替代Coze Bot，使用DeepSeek API + 本地RAG
 */

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || process.env.MODEL || 'deepseek-chat';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface DeepSeekStreamOptions {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  onChunk?: (chunk: string) => void;
  signal?: AbortSignal;
  returnUsage?: boolean;
}

export interface DeepSeekChatResult {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * 调用DeepSeek流式API，返回完整的文本响应
 * 当 returnUsage=true 且非流式时，返回 DeepSeekChatResult（含 usage）
 */
export async function deepSeekChat(
  options: DeepSeekStreamOptions & { returnUsage: true }
): Promise<DeepSeekChatResult>;
export async function deepSeekChat(
  options: DeepSeekStreamOptions & { returnUsage?: false }
): Promise<string>;
export async function deepSeekChat(
  options: DeepSeekStreamOptions
): Promise<string | DeepSeekChatResult> {
  const {
    messages,
    model = DEEPSEEK_MODEL,
    temperature = 0.7,
    maxTokens = 4096,
    onChunk,
    signal,
    returnUsage,
  } = options;

  if (!DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY not configured');
  }

  const response = await fetch(DEEPSEEK_BASE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: !!onChunk,
    }),
    signal,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} ${error}`);
  }

  // 非流式
  if (!onChunk) {
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    if (returnUsage) {
      return {
        content,
        usage: data.usage ? {
          prompt_tokens: data.usage.prompt_tokens || 0,
          completion_tokens: data.usage.completion_tokens || 0,
          total_tokens: data.usage.total_tokens || 0,
        } : undefined,
      };
    }
    return content;
  }

  // 流式读取
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let fullContent = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;
      if (!trimmed.startsWith('data: ')) continue;

      try {
        const data = JSON.parse(trimmed.slice(6));
        const content = data.choices?.[0]?.delta?.content || '';
        if (content) {
          fullContent += content;
          onChunk(content);
        }
      } catch {
        // 跳过解析失败的行
      }
    }
  }

  return fullContent;
}

/**
 * 将DeepSeek流式响应转换为SSE格式（兼容前端EventSource消费）
 */
export function createDeepSeekSSEStream(options: DeepSeekStreamOptions): ReadableStream {
  const encoder = new TextEncoder();
  const { returnUsage, ...streamOptions } = options;

  return new ReadableStream({
    async start(controller) {
      try {
        await deepSeekChat({
          ...streamOptions,
          onChunk: (chunk) => {
            // 输出 Coze 兼容格式 {type:'text',content}，与 createCozeSSEStream 对齐
            // 前端按 parsed.type 解析，OpenAI 风格的 choices/delta 会被前端忽略
            const data = JSON.stringify({
              type: 'text',
              content: chunk,
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          },
        });
        // 完成标记：Coze 风格 {type:'done'}，不用 [DONE]
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
        controller.close();
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        // 错误格式：Coze 风格 {type:'error',message}
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          message: errMsg,
        })}\n\n`));
        controller.close();
      }
    },
  });
}
