/**
 * 上下文压缩引擎
 * 
 * 职责：
 * - needsCompression: 判断是否需要触发压缩
 * - compressConversation: 执行增量摘要压缩
 * 
 * 压缩流程：
 *  1. 加载旧摘要 + 未压缩消息
 *  2. 调用 DeepSeek API 生成增量摘要
 *  3. 更新 conversations.summary
 *  4. 标记 chat_history.is_compressed = true
 *  5. 记录压缩快照到 compression_snapshots
 *  6. 如有画像变更，更新 user_profiles
 */

import { getSupabaseAdmin } from '@/lib/supabase';
import { generateSummary, estimateTokenCount } from '@/lib/deepseek/client';
import { buildCompressionPrompt } from '@/lib/deepseek/prompts';
import { updateUserProfile } from './profile';

/** 触发压缩的最小未压缩消息条数 */
const MIN_UNCOMPRESSED_COUNT = 10;

/**
 * needsCompression — 检查会话是否需要压缩
 */
export async function needsCompression(conversationId: string): Promise<boolean> {
  try {
    const supabase = getSupabaseAdmin();
    const { count, error } = await supabase
      .from('chat_history')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .eq('is_compressed', false);

    if (error) {
      console.error('[compression] needsCompression query error:', error);
      return false;
    }

    return (count || 0) >= MIN_UNCOMPRESSED_COUNT;
  } catch (err) {
    console.error('[compression] needsCompression error:', err);
    return false;
  }
}

/**
 * compressConversation — 执行增量摘要压缩
 * 
 * 异步 fire-and-forget，调用方不应阻塞等待
 */
export async function compressConversation(
  conversationId: string,
  userId: string,
): Promise<void> {
  console.log(`[compression] Starting for conversation ${conversationId}`);

  try {
    const supabase = getSupabaseAdmin();

    // 1. 获取旧摘要
    const { data: conv } = await supabase
      .from('conversations')
      .select('summary')
      .eq('id', conversationId)
      .maybeSingle();

    const oldSummary = conv?.summary || '';

    // 2. 获取所有未压缩消息
    const { data: newMessages } = await supabase
      .from('chat_history')
      .select('id, role, content')
      .eq('conversation_id', conversationId)
      .eq('is_compressed', false)
      .order('created_at', { ascending: true });

    if (!newMessages || newMessages.length === 0) {
      console.log(`[compression] No uncompressed messages, skipping`);
      return;
    }

    // 3. 构建消息文本
    const messagesText = newMessages
      .map(m => `[${m.role}]: ${m.content}`)
      .join('\n\n---\n\n');

    // 4. 调用 DeepSeek 生成增量摘要
    const prompt = buildCompressionPrompt(oldSummary, messagesText);
    let compressedResult: string;
    try {
      compressedResult = await generateSummary(prompt);
    } catch (dsErr) {
      console.error('[compression] DeepSeek API call failed:', dsErr);
      return;
    }

    // 5. 解析结果
    let parsed: {
      summary: Record<string, unknown>;
      profile_updates: Record<string, unknown> | null;
    };
    try {
      // 尝试提取 JSON（模型可能输出额外 markdown 包裹）
      const jsonMatch = compressedResult.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('[compression] No JSON found in response');
        return;
      }
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error('[compression] Failed to parse compression result:', parseErr);
      return;
    }

    const newSummary = JSON.stringify(parsed.summary);
    const profileUpdates = parsed.profile_updates;

    // 6. 更新会话摘要
    const { error: updateErr } = await supabase
      .from('conversations')
      .update({
        summary: newSummary,
        summary_updated_at: new Date().toISOString(),
        compressed_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    if (updateErr) {
      console.error('[compression] Failed to update summary:', updateErr);
      return;
    }

    // 7. 标记消息为已压缩
    const compressedIds = newMessages.map(m => m.id);
    await supabase
      .from('chat_history')
      .update({ is_compressed: true })
      .in('id', compressedIds);

    // 8. 记录压缩快照
    const originalTokens = newMessages.reduce((s, m) => s + estimateTokenCount(m.content || ''), 0);
    const summaryTokens = estimateTokenCount(newSummary);

    await supabase.from('compression_snapshots').insert({
      conversation_id: conversationId,
      compressed_message_ids: compressedIds,
      summary_content: newSummary,
      compressed_token_count: originalTokens,
      summary_token_count: summaryTokens,
      compression_ratio: originalTokens > 0 ? summaryTokens / originalTokens : 0,
      compression_model: 'deepseek-chat',
      trigger_type: 'round',
    });

    // 9. 更新用户画像（如有变更）
    if (profileUpdates && typeof profileUpdates === 'object') {
      const updates: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(profileUpdates)) {
        if (value !== null && value !== undefined) {
          updates[key] = value;
        }
      }
      if (Object.keys(updates).length > 0) {
        await updateUserProfile(userId, updates as Record<string, never>).catch(err => {
          console.error('[compression] Profile update failed:', err);
        });
      }
    }

    console.log(
      `[compression] Done: ${compressedIds.length} msgs compressed, ` +
      `ratio=${((summaryTokens / originalTokens) * 100).toFixed(1)}%`
    );
  } catch (err) {
    console.error('[compression] Unexpected error:', err);
  }
}
