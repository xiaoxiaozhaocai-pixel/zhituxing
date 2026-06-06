// lib/context-compression.ts
// 三层混合上下文压缩：画像锚定 + 增量摘要 + 最近N轮原文
// 目标：节省约73% token 消耗

import { getSupabaseAdmin } from '@/lib/supabase';


export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface SummaryJson {
  summary: string;
  key_decisions: string[];
  pending_items: string[];
  extracted_keywords: string[];
}

// ============================================================
// 1. 获取最近 n 轮原文（每轮 = 1 user + 1 assistant）
// ============================================================
export async function getRecentNRounds(
  conversationId: string,
  n: number
): Promise<ChatMessage[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('chat_history')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(n * 2);

  if (error) {
    console.error('[context-compression] getRecentNRounds error:', error);
    return [];
  }

  if (!data || data.length === 0) return [];

  // 反转回正序
  return (data as { role: string; content: string }[])
    .reverse()
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
}

// ============================================================
// 2. 组装上下文（三层混合）
// ============================================================
export async function assembleContext(
  conversationId: string,
  userId: string,
  maxRounds: number = 3
): Promise<{
  summary: SummaryJson | null;
  recentMessages: ChatMessage[];
  fullContextText: string;
}> {
  const supabase = getSupabaseAdmin();

  // 第一层：读取摘要
  let summary: SummaryJson | null = null;
  const { data: conversation } = await supabase
    .from('conversations')
    .select('summary')
    .eq('conversation_id', conversationId)
    .maybeSingle();

  if (conversation?.summary) {
    summary = conversation.summary as SummaryJson;
  }

  // 第二层：最近 maxRounds 轮原文
  const recentMessages = await getRecentNRounds(conversationId, maxRounds);

  // 组装 fullContextText
  const parts: string[] = [];

  if (summary) {
    parts.push(`【对话摘要】\n${summary.summary}`);
    if (summary.key_decisions.length > 0) {
      parts.push(`【关键决策】\n${summary.key_decisions.map((d, i) => `${i + 1}. ${d}`).join('\n')}`);
    }
    if (summary.pending_items.length > 0) {
      parts.push(`【待办事项】\n${summary.pending_items.map((p, i) => `${i + 1}. ${p}`).join('\n')}`);
    }
  }

  if (recentMessages.length > 0) {
    parts.push(`【最近对话】`);
    recentMessages.forEach(m => {
      parts.push(`${m.role === 'user' ? '用户' : '小职'}: ${m.content}`);
    });
  }

  return {
    summary,
    recentMessages,
    fullContextText: parts.join('\n\n'),
  };
}

// ============================================================
// 3. 检查是否需要压缩
// ============================================================
export async function needsCompression(conversationId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { count, error } = await supabase
    .from('chat_history')
    .select('*', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .eq('is_compressed', false);

  if (error) {
    console.error('[context-compression] needsCompression error:', error);
    return false;
  }

  return (count || 0) > 20;
}

// ============================================================
// 4. 自动降级检测
// ============================================================
export function autoDowngradeCheck(queries: string[]): 'hybrid' | 'window' {
  const keywords = ['刚才', '之前', '上次', '提到过', '前面说的', '之前说的'];
  let matchCount = 0;

  for (const query of queries) {
    if (keywords.some(kw => query.includes(kw))) {
      matchCount++;
    }
  }

  return matchCount >= 2 ? 'window' : 'hybrid';
}

// ============================================================
// 5. 压缩对话（增量摘要）
// ============================================================
export async function compressConversation(
  conversationId: string,
  userId: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  try {
    // 获取未压缩消息
    const { data: messages, error } = await supabase
      .from('chat_history')
      .select('id, role, content, created_at')
      .eq('conversation_id', conversationId)
      .eq('is_compressed', false)
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (!messages || messages.length === 0) return;

    // 读取已有摘要（增量模式）和 bot_type
    const { data: existing } = await supabase
      .from('conversations')
      .select('summary, bot_type')
      .eq('conversation_id', conversationId)
      .maybeSingle();

    const existingSummary = existing?.summary as SummaryJson | null;
    const botType = existing?.bot_type || null;

    // 构建对话文本
    const conversationText = (messages as Record<string, unknown>[])
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    // 构建压缩 prompt（增量）
    let compressionPrompt = '';
    if (existingSummary) {
      compressionPrompt = `以下是已有的对话摘要和新一轮对话内容，请对摘要进行增量更新（保留已有信息，合并新内容），输出 JSON：\n\n已有摘要：${JSON.stringify(existingSummary)}\n\n新一轮对话：\n${conversationText}\n\n请输出JSON格式（不要markdown代码块标记）：{ "summary": "更新后的摘要", "key_decisions": ["决策1", "决策2"], "pending_items": ["待办1"], "extracted_keywords": ["关键词1", "关键词2"] }`;
    } else {
      compressionPrompt = `请对以下对话进行摘要压缩，输出JSON格式（不要markdown代码块标记）：\n\n${conversationText}\n\n输出格式：{ "summary": "对话摘要，保留核心问题和回答要点", "key_decisions": ["关键决策列表"], "pending_items": ["待办事项"], "extracted_keywords": ["提取的关键词，用于指代检测"] }`;
    }

    // 调用 DeepSeek 生成摘要
    const summaryJson = await callDeepSeekForSummary(compressionPrompt);
    if (!summaryJson) {
      console.error('[compress] Failed to generate summary');
      return;
    }

    // 尝试解析 JSON
    let parsed: SummaryJson;
    try {
      parsed = JSON.parse(summaryJson);
    } catch {
      // 如果返回的不是纯JSON，当作纯文本摘要
      parsed = {
        summary: summaryJson.slice(0, 500),
        key_decisions: [],
        pending_items: [],
        extracted_keywords: [],
      };
    }

    // upsert conversations 表
    const { error: upsertError } = await supabase
      .from('conversations')
      .upsert({
        conversation_id: conversationId,
        user_id: userId,
        summary: parsed,
        bot_type: botType,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'conversation_id',
        ignoreDuplicates: false,
      });

    if (upsertError) throw upsertError;

    // 标记消息已压缩
    const messageIds = (messages as Record<string, unknown>[]).map(m => m.id);
    const { error: updateError } = await supabase
      .from('chat_history')
      .update({ is_compressed: true })
      .in('id', messageIds);

    if (updateError) throw updateError;

    console.log(`[compress] Conversation ${conversationId} compressed: ${messages.length} msgs`);
  } catch (error) {
    console.error('[compress] Error:', error);
  }
}

// ============================================================
// 6. 调用 DeepSeek 生成摘要
// ============================================================
async function callDeepSeekForSummary(prompt: string): Promise<string | null> {
  const startTime = Date.now();
  const MAX_RETRIES = 1;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: '你是一个专业的对话摘要生成器，输出JSON格式的摘要。不要使用markdown代码块标记，直接输出纯JSON。',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.1,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error('Empty response');

      const elapsed = Date.now() - startTime;
      console.log(`[compress] Summary generated in ${elapsed}ms (attempt ${attempt + 1})`);

      // 清理可能的 markdown 代码块标记
      return content
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`[compress] DeepSeek call attempt ${attempt + 1} failed:`, lastError.message);
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }

  console.error('[compress] All DeepSeek attempts failed:', lastError?.message);
  return null;
}

// ============================================================
// 7. 找回上下文（跨天/降级恢复）
// ============================================================
export async function recallContext(
  conversationId: string,
  userQuery: string
): Promise<string | null> {
  const supabase = getSupabaseAdmin();

  // 检测指代词
  const referencePattern = /刚才|之前|上次|提到过|前面|前面说的|之前说的/;
  if (!referencePattern.test(userQuery)) return null;

  // 读取摘要中的关键词
  const { data: conversation } = await supabase
    .from('conversations')
    .select('summary')
    .eq('conversation_id', conversationId)
    .maybeSingle();

  if (!conversation?.summary) return null;

  const summary = conversation.summary as SummaryJson;
  const keywords = summary.extracted_keywords || [];

  // 尝试从关键词匹配用户指代
  const matchedKeywords = keywords.filter(kw => userQuery.includes(kw));
  if (matchedKeywords.length > 0) {
    return `用户可能指的是：${matchedKeywords.join('、')}。相关摘要：${summary.summary}`;
  }

  return `对话摘要：${summary.summary}`;
}
