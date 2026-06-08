/**
 * Embedding 工具模块
 * 
 * 封装 DeepSeek Embedding API 调用，提供带缓存和降级的获取接口
 */

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_EMBEDDING_URL = 'https://api.deepseek.com/v1/embeddings';
const DEEPSEEK_EMBEDDING_MODEL = 'deepseek-embedding';

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
  if (!DEEPSEEK_API_KEY) {
    console.warn('[embedding] DEEPSEEK_API_KEY not configured');
    return [];
  }

  try {
    const response = await fetch(DEEPSEEK_EMBEDDING_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_EMBEDDING_MODEL,
        input: text,
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
        // 简单淘汰：删最早的一个
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
  return !!DEEPSEEK_API_KEY;
}
