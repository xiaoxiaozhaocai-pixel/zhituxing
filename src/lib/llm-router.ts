/**
 * LLM Router — 统一的 AI 模型网关抽象层
 * 
 * 当前行为：
 * - 默认直连 DeepSeek API（通过 LLM_BASE_URL 配置）
 * - 未来可一键切换至 OmniRoute / 其他网关
 * - 支持多模型路由、Token 压缩、成本控制
 * 
 * 用法：
 *   import { LLM_BASE_URL, llmFetch } from '@/lib/llm-router';
 *   const res = await llmFetch('/chat/completions', { ... });
 */

/** DeepSeek API Base URL（兼容 OpenAI 格式） */
export const LLM_BASE_URL = process.env.LLM_BASE_URL || 'https://api.deepseek.com';

/** 默认使用的模型 */
export const LLM_DEFAULT_MODEL = process.env.LLM_MODEL || 'deepseek-chat';

/**
 * 智能路由：根据请求类型返回对应的 base URL + 模型
 * - 'chat': 日常对话 → 基础模型
 * - 'premium': 付费功能（简历/评估/职业规划）→ 高质量模型
 * - 'summary': 摘要压缩 → 低成本模型
 */
export type RouteType = 'chat' | 'premium' | 'summary';

export interface RouteConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
}

export function getRouteConfig(type: RouteType = 'chat'): RouteConfig {
  const baseUrl = process.env.LLM_BASE_URL || 'https://api.deepseek.com';
  const apiKey = process.env.DEEPSEEK_API_KEY || '';

  // 路由策略：按请求类型分配不同模型
  const modelMap: Record<RouteType, string> = {
    'chat': process.env.LLM_MODEL_CHAT || process.env.LLM_MODEL || 'deepseek-chat',
    'premium': process.env.LLM_MODEL_PREMIUM || process.env.LLM_MODEL || 'deepseek-chat',
    'summary': process.env.LLM_MODEL_SUMMARY || process.env.LLM_MODEL || 'deepseek-chat',
  };

  return {
    baseUrl,
    model: modelMap[type],
    apiKey,
  };
}

/**
 * 向 LLM 发起请求（统一封装 fetch）
 * 自动拼接 baseUrl + path，处理认证头
 */
export async function llmFetch(
  path: string,
  body: Record<string, unknown>,
  routeType: RouteType = 'chat',
): Promise<Response> {
  const config = getRouteConfig(routeType);
  const url = `${config.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;

  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      ...body,
      model: body.model || config.model,
    }),
  });
}
