/**
 * 上下文组装器 — 三层混合上下文
 * 
 * 三层结构：
 *   第一层：用户画像锚定（永久保留）
 *   第二层：历史摘要层（增量滚动摘要）
 *   第三层：近期对话原文层（sliding window，最近 N 条）
 */

import { getSupabaseAdmin } from '@/lib/supabase';
import { estimateTokenCount } from '@/lib/deepseek/client';
import { formatProfileAnchor, formatSummaryText } from '@/lib/deepseek/prompts';
import { getUserProfile } from './profile';
import type { AssembledContext } from './types';

// 默认窗口大小
const DEFAULT_WINDOW_SIZE = 20; // 最近 20 条消息（10 轮）

/**
 * assembleContext — 组装发送给 LLM 的完整上下文
 * @param conversationId 会话 ID
 * @param userId 用户 ID
 * @param _windowSize 保留参数，兼容旧接口
 */
export async function assembleContext(
  conversationId: string,
  userId: string,
  _windowSize?: number,
): Promise<AssembledContext> {
  const windowSize = _windowSize && _windowSize > 0 ? _windowSize * 2 : DEFAULT_WINDOW_SIZE;
  const supabase = getSupabaseAdmin();

  // 并行加载：画像 + 摘要 + 近期消息
  const [profile, convData, messagesData] = await Promise.all([
    getUserProfile(userId),
    supabase
      .from('conversations')
      .select('summary, message_count')
      .eq('id', conversationId)
      .maybeSingle(),
    supabase
      .from('chat_history')
      .select('id, role, content, is_compressed')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true }),
  ]);

  const summary = convData?.summary || null;
  const allMessages = messagesData.data || [];

  // 分离已压缩和未压缩消息
  const uncompressedMessages = allMessages.filter(m => !m.is_compressed);
  const recentMessages = uncompressedMessages.slice(-windowSize);

  // 构建 fullContextText
  const parts: string[] = [];

  // 第一层：用户画像锚定
  if (profile) {
    const profileText = formatProfileAnchor(profile as unknown as Record<string, unknown>);
    if (profileText) parts.push(profileText);
  }

  // 第二层：历史摘要
  if (summary) {
    try {
      const summaryObj = JSON.parse(summary);
      const summaryText = formatSummaryText(summaryObj);
      if (summaryText) parts.push(summaryText);
    } catch {
      // 旧格式摘要（纯文本）
      if (summary.trim()) parts.push(`【对话进度摘要】\n${summary}`);
    }
  }

  const fullContextText = parts.join('\n\n---\n\n');

  // 判断是否需要压缩
  const uncompressedCount = uncompressedMessages.length;
  const estimatedTokens = estimateTokenCount(
    fullContextText + recentMessages.map(m => m.content).join(' ')
  );
  const shouldCompress = uncompressedCount >= 10 || estimatedTokens > 6000;

  return {
    fullContextText,
    recentMessages: recentMessages.map(m => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    })),
    summary,
    shouldCompress,
  };
}

/**
 * getRecentNRounds — 窗口截断模式（降级方案）
 * 只保留最近 N 条原文消息，不使用摘要
 */
export async function getRecentNRounds(
  conversationId: string,
  n: number,
): Promise<Array<{ role: 'user' | 'assistant' | 'system'; content: string }>> {
  const { data } = await getSupabaseAdmin()
    .from('chat_history')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (!data) return [];
  return data.slice(-n * 2).map(m => ({
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content,
  }));
}

/**
 * autoDowngradeCheck — 降级检测
 * 检测最近消息中是否频繁回溯历史，是则降级到 window 模式
 */
export function autoDowngradeCheck(
  recentMessages: string[],
): 'window' | 'hybrid' {
  const RECALL_PATTERNS = /刚才|之前|上次|前面|提到过|说过|聊过|记得|还记得/;
  const recallCount = recentMessages.filter(m => RECALL_PATTERNS.test(m)).length;

  // 最近 3 条消息中有 2 条在追问历史 → 降级
  if (recallCount >= 2) {
    return 'window';
  }
  return 'hybrid';
}
