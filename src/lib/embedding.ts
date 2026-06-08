/**
 * Embedding 工具模块
 * 
 * 封装 SiliconFlow BAAI/bge-large-zh-v1.5 Embedding API 调用，提供带缓存和降级的获取接口
 */

const SF_API_KEY = process.env.SILICONFLOW_API_KEY || '';
const SF_EMBEDDING_URL = 'https://api.siliconflow.cn/v1/embeddings';
const SF_EMBEDDING_MODEL = 'BAAI/bge-large-zh-v1.5';

// 内存 LRU 缓存（避免短时间内重复请求相同文本的embedding）
const cache = new Map<string, { embedding: number[]; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 分钟
const MAX_CACHE_SIZE = 200;

/** 获取文本的 embedding（带缓存） */
export async function getEmbedding(text: string): Promise<number[]> {
  // 检查缓存
  const cacheKey = text.slice(0, 200); // 用前200字做key
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.embedding;
  }

  // 调用 API
  if (!SF_API_KEY) {
    console.warn('[embedding] SILICONFLOW_API_KEY not configured, falling back to keyword search');
    return [];
  }

  // 截断过长的文本（bge 上限 ~512 tokens）
  const input = text.length > 400 ? text.slice(0, 400) : text;

  try {
    const response = await fetch(SF_EMBEDDING_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SF_API_KEY}`,
      },
      body: JSON.stringify({
        model: SF_EMBEDDING_MODEL,
        input: input,
      }),
      signal: AbortSignal.timeout(10000), // 10s 超时
    });

    if (!response.ok) {
      console.error(`[embedding] API error ${response.status}`);
      return [];
    }

    const data = await response.json();
    const embedding = data.data?.[0]?.embedding || [];

    // 写入缓存
    if (embedding.length > 0) {
      if (cache.size >= MAX_CACHE_SIZE) {
        const firstKey = cache.keys().next().value;
        if (firstKey) cache.delete(firstKey);
      }
      cache.set(cacheKey, { embedding, ts: Date.now() });
    }

    return embedding;
  } catch (err) {
    console.error('[embedding] Error:', err);
    return [];
  }
}

/** 检查 embedding 是否可用 */
export function isEmbeddingAvailable(): boolean {
  return !!SF_API_KEY;
}
