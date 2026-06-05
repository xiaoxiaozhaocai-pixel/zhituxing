/**
 * 内存版本限流（替代原 supabase 远程查询版本）
 *
 * 变更背景：
 *   原实现每次请求都对 supabase rate_limits 表做 1 次 SELECT + 1 次 INSERT，
 *   middleware 全局命中导致首页 TTFB 飙到 40s+、/auth 超 55s 直接超时。
 *
 * 设计：
 *   - 单实例内存 Map<key, timestamps[]>，O(1) 查询
 *   - 懒清理：每次调用先删过期时间戳
 *   - Map 大小上限 MAX_KEYS=50000，超过则按"最久未访问"清退 20%
 *   - API 签名与旧版本完全一致，调用方零改动
 *
 * 取舍：
 *   - 多实例不共享计数（Zeabur 当前单实例够用；上量加 Redis 再说）
 *   - 进程重启计数清零（限流目的是反爬，宽松无害）
 */

interface RateBucket {
  timestamps: number[];
  lastAccess: number;
}

const MAX_KEYS = 50000;
const buckets = new Map<string, RateBucket>();

function evictIfNeeded(): void {
  if (buckets.size <= MAX_KEYS) return;
  // 按 lastAccess 升序，淘汰最旧的 20%
  const entries = Array.from(buckets.entries());
  entries.sort((a, b) => a[1].lastAccess - b[1].lastAccess);
  const evictCount = Math.floor(MAX_KEYS * 0.2);
  for (let i = 0; i < evictCount; i++) {
    buckets.delete(entries[i]![0]);
  }
}

export async function checkRateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): Promise<{ allowed: boolean; remaining?: number }> {
  const now = Date.now();
  const windowStart = now - windowMs;

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { timestamps: [], lastAccess: now };
    buckets.set(key, bucket);
    evictIfNeeded();
  }

  // 懒清理过期时间戳
  bucket.timestamps = bucket.timestamps.filter((t) => t > windowStart);
  bucket.lastAccess = now;

  if (bucket.timestamps.length >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  bucket.timestamps.push(now);
  return { allowed: true, remaining: Math.max(0, maxRequests - bucket.timestamps.length) };
}

// P1-4 补充：同步版简易限流（用于 auth 端点等简单场景）
const simpleRateMap = new Map<string, { count: number; resetAt: number }>();

interface SimpleRateConfig {
  maxRequests: number;
  windowMs: number;
  endpoint: string;
}

export function rateLimit(ip: string, config: SimpleRateConfig): { allowed: boolean; remaining: number } {
  const key = `${config.endpoint}:${ip}`;
  const now = Date.now();
  const entry = simpleRateMap.get(key);

  if (!entry || now > entry.resetAt) {
    simpleRateMap.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1 };
  }

  entry.count++;
  if (entry.count > config.maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: config.maxRequests - entry.count };
}
