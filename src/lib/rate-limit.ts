/**
 * 速率限制工具 — Redis 优先（多实例共享状态）+ 内存 fallback
 * 防暴力破解、API 滥用、LLM 资源消耗
 * - REDIS_URL 已配置时：Lua 原子 INCR+PEXPIRE 窗口，实例重启/扩容限流不失效
 * - Redis 未配置/连接失败：静默降级内存实现（fail-open 优先保业务可用），60s 冷却后自动重试
 * - proxy.ts（Edge runtime 不支持 TCP 长连接）使用同步纯内存版 checkRateLimitMem
 */
import Redis from 'ioredis';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitRecord>();

// 每 5 分钟清理过期记录（仅内存模式使用）
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, record] of store) {
    if (now > record.resetTime) store.delete(key);
  }
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  retryAfter?: number;
}

const PRESETS = {
  /** 登录/注册：5次/分钟 防暴力破解 */
  auth: { maxRequests: 5, windowMs: 60_000 },
  /** 发送验证码：1次/分钟 防短信轰炸 */
  sendCode: { maxRequests: 1, windowMs: 60_000 },
  /** SSE 聊天：10次/分钟 防 Coze 资源滥用 */
  chat: { maxRequests: 10, windowMs: 60_000 },
  /** 通用 API：30次/分钟 */
  api: { maxRequests: 30, windowMs: 60_000 },
  /** 全局 IP：100次/分钟 */
  global: { maxRequests: 100, windowMs: 60_000 },
} as const;

/* ---------------- Redis 层 ---------------- */

// 原子窗口：INCR 计数 + 首次 PEXPIRE 设窗口 + PTTL 返回剩余毫秒，单次 RTT 完成
const WINDOW_LUA = `local c=redis.call('INCR',KEYS[1]) if c==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]) end return {c,redis.call('PTTL',KEYS[1])}`;

let redisClient: Redis | null = null;
let redisBroken = false;
let lastRedisFail = 0;
const REDIS_RETRY_COOLDOWN = 60_000;

function getRedis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  // 连接过失败：冷却期内直接走内存，避免每请求都吃连接超时
  if (redisBroken && Date.now() - lastRedisFail < REDIS_RETRY_COOLDOWN) return null;
  if (redisClient && !redisBroken) return redisClient;
  try {
    redisClient = new Redis(url, {
      connectTimeout: 2000,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 500, 2000)),
      lazyConnect: false,
    });
    redisClient.on('error', (err) => {
      if (!redisBroken) {
        redisBroken = true;
        lastRedisFail = Date.now();
        console.error('[rate-limit] redis error:', err?.message || err);
      }
    });
    redisClient.on('ready', () => {
      redisBroken = false;
    });
    return redisClient;
  } catch {
    redisBroken = true;
    lastRedisFail = Date.now();
    return null;
  }
}

async function redisCheck(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const res = (await redis.eval(
      WINDOW_LUA,
      1,
      `rl:${identifier}`,
      String(config.windowMs)
    )) as [number, number];
    const [count, pttl] = res;
    if (count > config.maxRequests) {
      return {
        success: false,
        remaining: 0,
        retryAfter: Math.ceil((pttl > 0 ? pttl : config.windowMs) / 1000),
      };
    }
    return { success: true, remaining: config.maxRequests - count };
  } catch {
    redisBroken = true;
    lastRedisFail = Date.now();
    return null; // 降级内存
  }
}

/* ---------------- 内存层（fallback） ---------------- */

export function checkRateLimitMem(identifier: string, config: RateLimitConfig): RateLimitResult {
  cleanup();
  const now = Date.now();
  const record = store.get(identifier);

  if (!record || now > record.resetTime) {
    store.set(identifier, { count: 1, resetTime: now + config.windowMs });
    return { success: true, remaining: config.maxRequests - 1 };
  }

  if (record.count >= config.maxRequests) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return { success: false, remaining: 0, retryAfter };
  }

  record.count++;
  return { success: true, remaining: config.maxRequests - record.count };
}

/* ---------------- 对外接口 ---------------- */

export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = PRESETS.api
): Promise<RateLimitResult> {
  const viaRedis = await redisCheck(identifier, config);
  if (viaRedis) return viaRedis;
  return checkRateLimitMem(identifier, config);
}

/**
 * 从 NextRequest 提取限流标识
 * 优先用户 ID → 降级 IP
 */
export function getRateLimitKey(
  userId: string | null,
  ip: string
): string {
  return userId ? `user:${userId}` : `ip:${ip}`;
}

export function getClientIP(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

/** 诊断用：Redis 限流层当前状态 */
export function getRedisStatus() {
  return {
    configured: Boolean(process.env.REDIS_URL),
    clientActive: Boolean(redisClient && !redisBroken),
    broken: redisBroken,
  };
}

export { PRESETS };
