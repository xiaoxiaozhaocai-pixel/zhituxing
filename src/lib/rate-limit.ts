/**
 * 内存速率限制工具类
 * Edge Runtime 兼容，使用 Map 存储请求计数
 */

export interface RateLimitConfig {
  /** 时间窗口（毫秒） */
  windowMs: number;
  /** 窗口内最大请求数 */
  maxRequests: number;
  /** 限流器名称（用于日志） */
  name: string;
}

export class RateLimiter {
  private requests = new Map<string, { count: number; resetAt: number }>();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    // 定期清理过期记录（每5分钟）
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }
  }

  /**
   * 检查是否允许请求
   * @param key 限流键（通常是 IP 或用户ID）
   * @returns { allowed: boolean, remaining: number, resetAt: number }
   */
  check(key: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const record = this.requests.get(key);

    // 无记录或窗口已过期，创建新窗口
    if (!record || now > record.resetAt) {
      const resetAt = now + this.config.windowMs;
      this.requests.set(key, { count: 1, resetAt });
      return { allowed: true, remaining: this.config.maxRequests - 1, resetAt };
    }

    // 检查是否超限
    if (record.count >= this.config.maxRequests) {
      return { allowed: false, remaining: 0, resetAt: record.resetAt };
    }

    // 允许请求，增加计数
    record.count++;
    return { allowed: true, remaining: this.config.maxRequests - record.count, resetAt: record.resetAt };
  }

  /**
   * 清理过期记录
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.requests.entries()) {
      if (now > record.resetAt) {
        this.requests.delete(key);
      }
    }
  }

  /**
   * 获取当前统计
   */
  getStats(): { totalKeys: number; config: RateLimitConfig } {
    return {
      totalKeys: this.requests.size,
      config: this.config,
    };
  }
}

// ============================================================
// 预定义限流器实例
// ============================================================

/** 全局限流器：100次/分钟 */
export const globalRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
  name: 'global',
});

/** 认证限流器：5次/分钟 */
export const authRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 5,
  name: 'auth',
});

/** 对话限流器：5次/分钟 */
export const chatRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 5,
  name: 'chat',
});

/** 职位搜索限流器：30次/分钟 */
export const jobsRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  name: 'jobs',
});
