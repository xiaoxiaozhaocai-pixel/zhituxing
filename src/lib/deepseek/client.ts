/**
 * DeepSeek API 客户端
 * 封装对 DeepSeek API 的调用，支持主对话和压缩摘要两种场景
 */

import { LLM_BASE_URL } from '@/lib/llm-router';

const DS_API_BASE = `${LLM_BASE_URL}/v1/chat/completions`;

function getApiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error('DEEPSEEK_API_KEY not configured');
  return key;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatOptions {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface ChatResult {
  content: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * 通用聊天调用
 */
export async function chatWithDS(opts: ChatOptions): Promise<ChatResult> {
  const { messages, model = 'deepseek-chat', temperature = 0.7, max_tokens = 4096 } = opts;

  const res = await fetch(DS_API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({ model, messages, temperature, max_tokens }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`DeepSeek API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return {
    content: data.choices[0].message.content,
    usage: data.usage,
  };
}

/**
 * 摘要压缩调用
 * 固定使用 deepseek-chat，低温度保证一致性
 */
export async function generateSummary(prompt: string): Promise<string> {
  const res = await fetch(DS_API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`DeepSeek compression error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

/** 粗略估算 token 数（中文约 1.5 字符/token，英文约 4 字符/token） */
export function estimateTokenCount(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars / 1.5 + otherChars / 4);
}
