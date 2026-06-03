/**
 * 聊天上下文准备工具
 * 处理：conversationId 生成、三层混合上下文压缩、AI 响应缓存查询
 */

import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase';
import {
  assembleContext,
  getRecentNRounds,
  autoDowngradeCheck,
} from '@/lib/context-compression';

export interface ChatContextParams {
  basePrompt: string;
  ragContext: string;
  ragDegradationNote: string;
  roleReinforcement: string;
  conversationId: string | undefined;
  userId: string;
  message: string;
}

export interface ChatContextResult {
  systemPrompt: string;
  history: { role: 'user' | 'assistant' | 'system'; content: string }[];
  effectiveConversationId: string;
  cachedResponse: string | null;
  cacheKey: string;
  isCacheable: boolean;
}

/**
 * 准备聊天上下文：组装 systemPrompt + 处理历史压缩 + 查询缓存
 */
export async function prepareChatContext(params: ChatContextParams): Promise<ChatContextResult> {
  const { basePrompt, ragContext, ragDegradationNote, roleReinforcement, conversationId, userId, message } = params;

  let history: { role: 'user' | 'assistant' | 'system'; content: string }[] = [];
  let effectiveConversationId = conversationId;

  // 生成新的 conversationId（如果没有）
  if (!effectiveConversationId) {
    effectiveConversationId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  // 降级检测：用户频繁追问历史时退回到窗口截断
  const compressionLevel = autoDowngradeCheck([message]);
  let systemPrompt = '';

  if (compressionLevel === 'window') {
    systemPrompt = basePrompt + '\n\n' + ragContext + ragDegradationNote + roleReinforcement;
    history = await getRecentNRounds(effectiveConversationId, 15);
    console.log(`[chat] Context compression: downgraded to window mode (15 rounds)`);
  } else {
    const context = await assembleContext(effectiveConversationId, userId || '', 3);
    systemPrompt = basePrompt + '\n\n' + ragContext + ragDegradationNote + '\n\n' + context.fullContextText + roleReinforcement;
    history = context.recentMessages;
    console.log(`[chat] Context compression: hybrid mode, summary=${!!context.summary}, recent=${context.recentMessages.length}msgs`);
  }

  // AI 响应缓存查询
  let cachedResponse: string | null = null;
  const isCacheable = history.length === 0;
  let cacheKey = '';

  if (isCacheable) {
    cacheKey = crypto.createHash('md5')
      .update(systemPrompt + '|||' + message)
      .digest('hex');
    try {
      const { data: cached } = await getSupabaseAdmin()
        .from('ai_cache')
        .select('response')
        .eq('cache_key', cacheKey)
        .gte('expires_at', new Date().toISOString())
        .maybeSingle();
      if (cached?.response) {
        console.log(`[chat] CACHE HIT: ${cacheKey}`);
        cachedResponse = cached.response;
      }
    } catch (cacheErr) {
      console.error('[chat] Cache query error:', cacheErr);
    }
  }

  return { systemPrompt, history, effectiveConversationId, cachedResponse, cacheKey, isCacheable };
}
