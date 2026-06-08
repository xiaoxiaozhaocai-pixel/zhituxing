/**
 * 对话历史保存工具
 * 统一处理 chat_history 写入（SQL exec + REST fallback）+ 缓存写入 + 压缩触发
 */

export interface SaveHistoryParams {
  userId: string;
  conversationId: string;
  userMessage: string;
  assistantResponse: string;
  botType: string;
}

export interface SaveHistoryResult {
  saveResult: string;
  convId: string;
}

const escapeSql = (str: string | undefined | null) => (str || '').replace(/'/g, "''");

/**
 * 保存一轮对话到 chat_history 表
 * 优先使用 SQL exec RPC，失败时回退到 REST API
 */
async function insertChatHistory(params: SaveHistoryParams): Promise<string> {
  const { userId, conversationId, userMessage, assistantResponse, botType } = params;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const sql = `
    INSERT INTO public.chat_history (conversation_id, user_id, role, content, bot_type) VALUES
    ('${escapeSql(conversationId)}', '${escapeSql(userId)}', 'user', '${escapeSql(userMessage)}', ${botType ? `'${escapeSql(botType)}'` : 'NULL'}),
    ('${escapeSql(conversationId)}', '${escapeSql(userId)}', 'assistant', '${escapeSql(assistantResponse)}', ${botType ? `'${escapeSql(botType)}'` : 'NULL'});
  `;

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey || '',
        'Authorization': `Bearer ${supabaseKey || ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql }),
    });

    if (!response.ok && response.status === 404) {
      const fallbackRes = await fetch(`${supabaseUrl}/rest/v1/chat_history`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey || '',
          'Authorization': `Bearer ${supabaseKey || ''}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify([
          { conversation_id: conversationId, user_id: userId, role: 'user', content: userMessage, bot_type: botType },
          { conversation_id: conversationId, user_id: userId, role: 'assistant', content: assistantResponse, bot_type: botType }
        ]),
      });

      if (!fallbackRes.ok) {
        const errText = await fallbackRes.text();
        console.error('[chat] Fallback insert error:', fallbackRes.status, errText);
        return `error:fallback:${fallbackRes.status}`;
      }
      console.log('[chat] SUCCESS! Saved via fallback REST API');
      return 'success';
    } else if (!response.ok) {
      const errText = await response.text();
      console.error('[chat] SQL exec error:', response.status, errText);
      return `error:${response.status}`;
    }
    console.log('[chat] SUCCESS! Saved via SQL endpoint');
    return 'success';
  } catch (err) {
    console.error('[chat] Exception saving history:', err);
    return `exception:${err instanceof Error ? err.message : 'unknown'}`;
  }
}

/**
 * 写入 AI 响应缓存（fire-and-forget）
 */
export function writeAICache(cacheKey: string, response: string, model = 'deepseek-chat') {
  const sql = `INSERT INTO public.ai_cache (cache_key, response, model) VALUES ('${escapeSql(cacheKey)}', '${escapeSql(response)}', '${escapeSql(model)}') ON CONFLICT (cache_key) DO NOTHING;`;
  fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/rpc/exec', {
    method: 'POST',
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      'Authorization': 'Bearer ' + (process.env.SUPABASE_SERVICE_ROLE_KEY || ''),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql }),
  }).then(() => console.log(`[chat] Cache WRITE: ${cacheKey}`))
    .catch(e => console.error('[chat] Cache write error:', e));
}

/**
 * 保存一轮对话 + 写入缓存 + 触发压缩（fire-and-forget）
 */
export async function saveChatHistory(
  params: SaveHistoryParams,
  cacheKey?: string,
  triggerCompression?: { conversationId: string; userId: string; needsCheck: () => Promise<boolean>; runCompression: (convId: string, uid: string) => Promise<void> },
): Promise<SaveHistoryResult> {
  const { userId, conversationId, userMessage: _userMessage, assistantResponse, botType: _botType } = params;

  console.log(`[chat] Before save: fullResponse.length=${assistantResponse?.length || 0}, userId=${userId}, conversationId=${conversationId}`);
  console.log(`[chat] fullResponse preview: ${assistantResponse?.substring(0, 100) || 'EMPTY'}`);

  let saveResult = 'skipped';
  if (assistantResponse && userId) {
    saveResult = await insertChatHistory(params);
  } else {
    console.log('[chat] Skip saving history: assistantResponse=', !!assistantResponse, 'userId=', !!userId);
  }

  // 写入 AI 缓存（fire-and-forget）
  if (cacheKey && assistantResponse) {
    writeAICache(cacheKey, assistantResponse);
  }

  // Fire-and-forget: 检查并触发上下文压缩
  if (triggerCompression && assistantResponse && userId) {
    try {
      if (await triggerCompression.needsCheck()) {
        triggerCompression.runCompression(conversationId, userId).catch(e =>
          console.error('[chat] Background compression failed:', e)
        );
      }
    } catch (compressErr) {
      console.error('[chat] Compression check error:', compressErr);
    }
  }

  return { saveResult, convId: conversationId };
}
