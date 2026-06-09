/**
 * 速率限制工具 — 内存级实现
 * P1 修复：防止暴力破解、API 滥用、Coze 资源消耗
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitRecord>();

// 每 5 分钟清理过期记录
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

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = PRESETS.api
): RateLimitResult {
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

export { PRESETS };
